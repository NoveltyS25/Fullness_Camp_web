"use server";

import { redirect } from "next/navigation";
import { normalizeWhatsapp } from "@/lib/campus/phone";
import { headers } from "next/headers";
import { getProgram } from "@/data/programs";
import { expectedDocumentKeys, recordAcceptance, startsWithinRetractWindow } from "@/server/acceptance";
import { getDb } from "@/server/db";
import { createOrder } from "@/server/orders";
import { checkoutPathFor, paymentProvider } from "@/server/payments";
import { normalizeCedula } from "@/server/security";
import { clientIp } from "@/server/web";

export interface CheckoutState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function startCheckoutAction(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const name = text(fd, "name").slice(0, 120);
  const cedula = normalizeCedula(text(fd, "cedula"));
  const email = text(fd, "email").toLowerCase();
  const rawPhone = text(fd, "phone");
  const phone = rawPhone ? normalizeWhatsapp(rawPhone) : null;

  if (name.split(/\s+/).length < 2) return { error: "Escribe tu nombre y apellido." };
  if (!cedula) return { error: "Escribe tu cédula (solo números, sin puntos)." };
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido: ahí te enviaremos el acceso." };
  if (rawPhone && !phone) return { error: "El número de WhatsApp no es válido. Ejemplo: 311 674 1900" };
  if (fd.get("accept_core") !== "on") return { error: "Debes aceptar el contrato y las políticas de matrícula, cancelación y reembolso para continuar." };
  if (fd.get("accept_data") !== "on") return { error: "Debes autorizar el tratamiento de tus datos personales para poder inscribirte." };
  if (fd.get("accept_health") !== "on") return { error: "Marca la casilla de salud y práctica de yoga para continuar." };

  let slugs: string[] = [];
  try {
    const parsed: unknown = JSON.parse(text(fd, "slugs"));
    if (Array.isArray(parsed)) slugs = parsed.filter((s): s is string => typeof s === "string").slice(0, 20);
  } catch {
    return { error: "No pudimos leer tu carrito. Vuelve al carrito e inténtalo de nuevo." };
  }

  // El precio SIEMPRE se calcula en el servidor con el catálogo; del navegador solo llegan los identificadores.
  const db = getDb();
  // Si algún programa empieza dentro de los 5 días hábiles del retracto, hace falta el consentimiento expreso de inicio anticipado.
  const needsEarly = await startsWithinRetractWindow(db, slugs);
  if (needsEarly && fd.get("accept_early") !== "on") {
    return { error: "Este programa empieza pronto: marca la casilla que autoriza el inicio antes de que venza tu plazo de retracto." };
  }
  const result = await createOrder(db, { cedula, name, email, phone }, slugs, text(fd, "coupon") || null, paymentProvider(), text(fd, "attribution") || null);
  if (!result.ok) return { error: result.error };

  // Aceptación con evidencia: los documentos que aplican se calculan aquí, con lo que de verdad se compró (no con lo que mande el navegador).
  const purchased = (await db.all<{ program_slug: string }>("SELECT program_slug FROM order_items WHERE order_id = ?", [result.orderId])).map((r) => r.program_slug);
  const categories = purchased.map((s) => getProgram(s)?.category).filter((c): c is NonNullable<typeof c> => !!c);
  await recordAcceptance(db, {
    userId: null,
    cedula,
    email,
    fullName: name,
    orderId: result.orderId,
    context: "checkout",
    keys: expectedDocumentKeys(categories),
    consents: { data: true, health: true, image: fd.get("accept_image") === "on", marketing: fd.get("accept_marketing") === "on", early_start: needsEarly },
    ip: await clientIp(),
    userAgent: (await headers()).get("user-agent") ?? "",
  });

  redirect(checkoutPathFor(result.orderId));
}
