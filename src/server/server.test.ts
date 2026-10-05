import assert from "node:assert/strict";
import { test } from "node:test";
import { consumePasswordReset, createPasswordReset, getUserBySessionToken, login } from "./auth.ts";
import { newId, nowIso, openDb, type Db } from "./db/index.ts";
import { completeOrder, createOrder, failOrder, getOrder } from "./orders.ts";
import { generateTempPassword, hashPassword, normalizeCedula, validateNewPassword, verifyPassword } from "./security.ts";
import { createUser, findUserByCedula, setPassword } from "./users.ts";

const BASE = "http://localhost:3000";
const buyer = { cedula: "1020304050", name: "María Fernanda López", email: "maria@example.com", phone: "573116741900" };
const SLUG = "hatha-vinyasa-yoga-y-meditacion"; // 3.500.000 COP, certificación

async function setup(): Promise<Db> {
  const db = openDb(":memory:");
  await db.run("INSERT INTO cohorts (id, program_slug, name, sede, starts_on, active, created_at) VALUES (?, ?, ?, 'Bogotá', '2099-01-10', 1, ?)", [newId(), SLUG, "Hatha 300h Bogotá", nowIso()]);
  return db;
}

async function lastEmail(db: Db, to: string) {
  return db.get<{ subject: string; body_text: string; status: string }>(
    "SELECT subject, body_text, status FROM outbox WHERE to_address = ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
    [to],
  );
}

test("contraseñas: se guardan con hash y se verifican", async () => {
  const h = await hashPassword("Clave-123");
  assert.ok(!h.includes("Clave-123"));
  assert.equal(await verifyPassword("Clave-123", h), true);
  assert.equal(await verifyPassword("otra", h), false);
  assert.match(generateTempPassword(), /^[a-zA-Z2-9]{10}$/);
  assert.ok(!/[0OlI1]/.test(generateTempPassword(200)));
});

test("la contraseña nueva exige 8 caracteres, letra y número, y no ser la cédula", () => {
  assert.ok(validateNewPassword("corta1", "123"));
  assert.ok(validateNewPassword("sinnumeros", "123"));
  assert.ok(validateNewPassword("12345678", "123"));
  assert.ok(validateNewPassword("abc1020304050", "1020304050")); // letras + la cédula también se rechaza
  assert.ok(validateNewPassword("1020304050", "1020304050"));
  assert.equal(validateNewPassword("Yoga2026Paz", "1020304050"), null);
});

test("la cédula acepta puntos y espacios y rechaza letras", () => {
  assert.equal(normalizeCedula("1.020.304.050"), "1020304050");
  assert.equal(normalizeCedula(" 52 259 046 "), "52259046");
  assert.equal(normalizeCedula("12ab"), null);
  assert.equal(normalizeCedula("123"), null);
});

test("ingreso: correcto, incorrecto y bloqueo tras 5 fallos", async () => {
  const db = await setup();
  const u = await createUser(db, { cedula: "52259046", fullName: "Ana", email: "ana@x.co", password: "Correcta123" });

  const ok = await login(db, "52.259.046", "Correcta123", "1.1.1.1");
  assert.ok(ok.ok);
  if (ok.ok) assert.equal((await getUserBySessionToken(db, ok.token))?.id, u.id);

  for (let i = 0; i < 5; i++) assert.deepEqual(await login(db, "52259046", "mala", "2.2.2.2"), { ok: false, reason: "invalid" });
  assert.deepEqual(await login(db, "52259046", "Correcta123", "3.3.3.3"), { ok: false, reason: "locked" });
  assert.deepEqual(await login(db, "99999999", "x", "4.4.4.4"), { ok: false, reason: "invalid" }); // cédula inexistente: misma respuesta
  assert.deepEqual(await login(db, "abc", "x", "4.4.4.4"), { ok: false, reason: "bad-input" });
});

test("el precio del pedido se calcula en el servidor", async () => {
  const db = await setup();
  const r = await createOrder(db, buyer, [SLUG, "india", "no-existe"], null, "demo");
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.total, 2_975_000); // 15% de descuento; "india" y "no-existe" se ignoran
  const items = await db.all("SELECT * FROM order_items WHERE order_id = ?", [r.orderId]);
  assert.equal(items.length, 1);

  const vacio = await createOrder(db, buyer, ["india"], null, "demo");
  assert.equal(vacio.ok, false);
});

test("pagar crea la cuenta, inscribe, asigna grupo y manda el paso a paso", async () => {
  const db = await setup();
  const r = await createOrder(db, buyer, [SLUG], null, "demo");
  assert.ok(r.ok);
  if (!r.ok) return;

  // Antes de pagar no existe cuenta ni acceso.
  assert.equal(await findUserByCedula(db, buyer.cedula), undefined);

  const res = await completeOrder(db, r.orderId, "REF-1", BASE);
  assert.deepEqual(res, { alreadyPaid: false, userCreated: true });

  const user = await findUserByCedula(db, buyer.cedula);
  assert.ok(user);
  assert.equal(user.must_change_password, 1);
  assert.equal(user.email, "maria@example.com");

  const enr = await db.all<{ status: string; cohort_id: string | null }>("SELECT status, cohort_id FROM enrollments WHERE user_id = ?", [user.id]);
  assert.equal(enr.length, 1);
  assert.equal(enr[0].status, "active");
  assert.ok(enr[0].cohort_id, "debe quedar en el grupo abierto");
  assert.equal((await getOrder(db, r.orderId))?.status, "paid");

  // El correo trae la cédula, una contraseña temporal que SÍ sirve para entrar, y los pasos.
  const mail = await lastEmail(db, buyer.email);
  assert.ok(mail);
  assert.match(mail.subject, /Bienvenida/);
  assert.match(mail.body_text, new RegExp(buyer.cedula));
  assert.match(mail.body_text, /crear una contraseña nueva/);
  const temp = /contraseña temporal: (\S+)/.exec(mail.body_text)?.[1];
  assert.ok(temp);
  const entrada = await login(db, buyer.cedula, temp, "9.9.9.9");
  assert.ok(entrada.ok);
  if (entrada.ok) assert.equal(entrada.user.must_change_password, 1); // primer ingreso: debe cambiarla
});

test("confirmar el mismo pago dos veces no duplica nada", async () => {
  const db = await setup();
  const r = await createOrder(db, buyer, [SLUG], null, "demo");
  if (!r.ok) return assert.fail();
  await completeOrder(db, r.orderId, "REF-1", BASE);
  const again = await completeOrder(db, r.orderId, "REF-1", BASE);
  assert.equal(again.alreadyPaid, true);
  assert.equal((await db.all("SELECT 1 FROM enrollments")).length, 1);
  assert.equal((await db.all("SELECT 1 FROM users")).length, 1);
  assert.equal((await db.all("SELECT 1 FROM outbox WHERE channel = 'email'")).length, 1);
});

test("un pedido fallido no se puede confirmar ni da acceso", async () => {
  const db = await setup();
  const r = await createOrder(db, buyer, [SLUG], null, "demo");
  if (!r.ok) return assert.fail();
  await failOrder(db, r.orderId);
  await assert.rejects(() => completeOrder(db, r.orderId, "X", BASE));
  assert.equal(await findUserByCedula(db, buyer.cedula), undefined);
  assert.equal((await db.all("SELECT 1 FROM enrollments")).length, 0);
});

test("quien ya tiene cuenta conserva su contraseña y recibe el nuevo programa", async () => {
  const db = await setup();
  await createUser(db, { cedula: buyer.cedula, fullName: buyer.name, email: buyer.email, password: "Antigua2025x", mustChange: false });
  const r = await createOrder(db, buyer, [SLUG], null, "demo");
  if (!r.ok) return assert.fail();
  const res = await completeOrder(db, r.orderId, "REF-2", BASE);
  assert.equal(res.userCreated, false);

  assert.ok((await login(db, buyer.cedula, "Antigua2025x", "5.5.5.5")).ok, "la contraseña anterior sigue funcionando");
  const mail = await lastEmail(db, buyer.email);
  assert.ok(mail && !/temporal/.test(mail.body_text));
  assert.match(mail.body_text, /ya tenías/);
});

test("si el correo de pago es otro, la contraseña va solo al correo de la cuenta", async () => {
  const db = await setup();
  await createUser(db, { cedula: buyer.cedula, fullName: buyer.name, email: "cuenta@x.co", password: "Antigua2025x", mustChange: false });
  const r = await createOrder(db, { ...buyer, email: "pagador@x.co" }, [SLUG], null, "demo");
  if (!r.ok) return assert.fail();
  await completeOrder(db, r.orderId, "REF-3", BASE);
  const aPagador = await lastEmail(db, "pagador@x.co");
  assert.ok(aPagador);
  assert.match(aPagador.subject, /Recibimos tu pago/);
  assert.ok(!/temporal|Cédula/.test(aPagador.body_text), "el recibo no trae datos de acceso");
  assert.ok(await lastEmail(db, "cuenta@x.co"));
});

test("cambiar la contraseña quita la obligación y cierra las demás sesiones", async () => {
  const db = await setup();
  const u = await createUser(db, { cedula: "70123456", fullName: "Luz", email: "luz@x.co", password: "Temporal123" });
  const a = await login(db, "70123456", "Temporal123", "1.1.1.1");
  const b = await login(db, "70123456", "Temporal123", "1.1.1.1");
  if (!a.ok || !b.ok) return assert.fail();
  const { hashToken } = await import("./security.ts");
  await setPassword(db, u.id, "NuevaClave2026", hashToken(a.token));

  assert.equal((await findUserByCedula(db, "70123456"))?.must_change_password, 0);
  assert.ok(await getUserBySessionToken(db, a.token), "la sesión actual sigue");
  assert.equal(await getUserBySessionToken(db, b.token), undefined, "la otra sesión se cerró");
  assert.equal((await login(db, "70123456", "Temporal123", "1.1.1.1")).ok, false);
  assert.ok((await login(db, "70123456", "NuevaClave2026", "1.1.1.1")).ok);
});

test("el enlace para recuperar la contraseña sirve una sola vez", async () => {
  const db = await setup();
  const u = await createUser(db, { cedula: "70123456", fullName: "Luz", email: "luz@x.co", password: "Temporal123" });
  const token = await createPasswordReset(db, u.id);
  assert.equal(await consumePasswordReset(db, token), u.id);
  assert.equal(await consumePasswordReset(db, token), undefined);
  assert.equal(await consumePasswordReset(db, "inventado"), undefined);
});
