import { getProgram } from "../data/programs.ts";
import { priceCart } from "../lib/pricing.ts";
import { newId, nowIso, type Db } from "./db/index.ts";
import { sendEmail } from "./outbox.ts";
import { generateTempPassword, hashPassword } from "./security.ts";
import { receiptEmail, welcomeEmail } from "./templates.ts";
import { USER_COLUMNS, type User } from "./users.ts";

export interface Buyer {
  cedula: string;
  name: string;
  email: string;
  phone: string | null;
}

export type CreateOrderResult = { ok: true; orderId: string; total: number } | { ok: false; error: string };

/** Crea el pedido con los precios calculados AQUÍ, en el servidor: lo que mande el navegador no cuenta. */
export async function createOrder(
  db: Db,
  buyer: Buyer,
  slugs: string[],
  couponCode: string | null,
  provider: string,
): Promise<CreateOrderResult> {
  const quote = priceCart(slugs, couponCode);
  if (quote.lines.length === 0) return { ok: false, error: "Tu carrito no tiene programas disponibles para pagar." };

  const orderId = newId();
  const applied = quote.couponStatus === "applied" ? (couponCode ?? "").trim().toUpperCase() : null;
  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO orders (id, status, buyer_cedula, buyer_name, buyer_email, buyer_phone, subtotal, discount, total, currency, coupon_code, provider, created_at)
       VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, 'COP', ?, ?, ?)`,
      [orderId, buyer.cedula, buyer.name, buyer.email.toLowerCase(), buyer.phone, quote.subtotal, quote.discount, quote.total, applied, provider, nowIso()],
    );
    for (const l of quote.lines) {
      await tx.run(
        "INSERT INTO order_items (id, order_id, program_slug, title, list_price, discount, total) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [newId(), orderId, l.slug, l.title, l.listPrice, l.discount, l.total],
      );
    }
  });
  return { ok: true, orderId, total: quote.total };
}

interface OrderRow {
  id: string;
  status: "pending" | "paid" | "failed" | "cancelled";
  buyer_cedula: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  total: number;
}

export function getOrder(db: Db, id: string): Promise<OrderRow | undefined> {
  return db.get<OrderRow>(
    "SELECT id, status, buyer_cedula, buyer_name, buyer_email, buyer_phone, total FROM orders WHERE id = ?",
    [id],
  );
}

export function getOrderItems(db: Db, orderId: string) {
  return db.all<{ program_slug: string; title: string; total: number }>(
    "SELECT program_slug, title, total FROM order_items WHERE order_id = ?",
    [orderId],
  );
}

export async function failOrder(db: Db, orderId: string): Promise<void> {
  await db.run("UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending'", [orderId]);
}

export interface CompleteResult {
  alreadyPaid: boolean;
  userCreated: boolean;
}

/**
 * Confirma un pago: lo llama la pasarela (hoy la simulada, mañana el webhook de Bold). Es idempotente:
 * si la pasarela avisa dos veces, la segunda no duplica cuenta, inscripciones ni correos.
 *  1. marca el pedido como pagado,
 *  2. crea la cuenta del campus con la cédula (o reutiliza la que ya existe),
 *  3. inscribe a la persona en cada programa (y en un grupo abierto, si lo hay),
 *  4. le envía el paso a paso para entrar.
 */
export async function completeOrder(db: Db, orderId: string, providerRef: string, baseUrl: string): Promise<CompleteResult> {
  const order = await getOrder(db, orderId);
  if (!order) throw new Error("Pedido no encontrado");
  if (order.status === "paid") return { alreadyPaid: true, userCreated: false };
  if (order.status !== "pending") throw new Error(`El pedido está ${order.status} y no se puede confirmar`);

  const items = await getOrderItems(db, orderId);

  // El hash de la contraseña temporal se calcula antes de abrir la transacción (es trabajo lento).
  const tempPassword = generateTempPassword();
  const tempHash = await hashPassword(tempPassword);
  const today = new Date().toISOString().slice(0, 10);

  const outcome = await db.transaction(async (tx) => {
    const fresh = await tx.get<{ status: string }>("SELECT status FROM orders WHERE id = ?", [orderId]);
    if (fresh?.status !== "pending") return null; // otra confirmación llegó primero

    let user = await tx.get<User>(`SELECT ${USER_COLUMNS} FROM users WHERE cedula = ?`, [order.buyer_cedula]);
    let created = false;
    if (!user) {
      const id = newId();
      await tx.run(
        `INSERT INTO users (id, cedula, full_name, email, whatsapp_phone, role, password_hash, must_change_password, notify_whatsapp, created_at)
         VALUES (?, ?, ?, ?, ?, 'student', ?, 1, ?, ?)`,
        [id, order.buyer_cedula, order.buyer_name, order.buyer_email, order.buyer_phone, tempHash, order.buyer_phone ? 1 : 0, nowIso()],
      );
      user = (await tx.get<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]))!;
      created = true;
    }

    const enrolled: { title: string; cohortName: string | null }[] = [];
    for (const item of items) {
      // Grupo abierto del programa: prefiere el que empieza más pronto desde hoy.
      const cohort = await tx.get<{ id: string; name: string }>(
        `SELECT id, name FROM cohorts WHERE program_slug = ? AND active = 1
         ORDER BY CASE WHEN starts_on IS NOT NULL AND starts_on >= ? THEN 0 ELSE 1 END, starts_on LIMIT 1`,
        [item.program_slug, today],
      );
      const exists = await tx.get(
        "SELECT 1 AS ok FROM enrollments WHERE user_id = ? AND program_slug = ? AND order_id = ?",
        [user.id, item.program_slug, orderId],
      );
      if (!exists) {
        await tx.run(
          "INSERT INTO enrollments (id, user_id, program_slug, cohort_id, order_id, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?)",
          [newId(), user.id, item.program_slug, cohort?.id ?? null, orderId, nowIso()],
        );
      }
      enrolled.push({ title: getProgram(item.program_slug)?.title ?? item.title, cohortName: cohort?.name ?? null });
    }

    await tx.run("UPDATE orders SET status = 'paid', paid_at = ?, provider_ref = ?, user_id = ? WHERE id = ?", [
      nowIso(),
      providerRef,
      user.id,
      orderId,
    ]);
    return { user, created, enrolled };
  });

  if (!outcome) return { alreadyPaid: true, userCreated: false };

  // Los correos se envían después de guardar todo: si fallan, el pago y la inscripción ya quedaron firmes.
  const { user, created, enrolled } = outcome;
  const welcome = welcomeEmail({
    fullName: user.full_name,
    cedula: user.cedula,
    tempPassword: created ? tempPassword : null,
    programs: enrolled,
    payment: { orderId, total: order.total },
    loginUrl: `${baseUrl}/campus/ingresar`,
    recoverUrl: `${baseUrl}/campus/recuperar`,
  });
  await sendEmail(db, { to: user.email, ...welcome });

  if (order.buyer_email.toLowerCase() !== user.email.toLowerCase()) {
    const [name, domain] = user.email.split("@");
    const hint = `${name.slice(0, 2)}***@${domain}`;
    await sendEmail(db, {
      to: order.buyer_email,
      ...receiptEmail({ buyerName: order.buyer_name, programs: enrolled.map((e) => e.title), total: order.total, orderId, accountEmailHint: hint }),
    });
  }

  return { alreadyPaid: false, userCreated: created };
}
