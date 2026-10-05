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

test("pagar crea la cuenta, inscribe, asigna grupo y manda el enlace para crear la contraseña", async () => {
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
  assert.equal(user.must_change_password, 1); // aún no ha creado su contraseña
  assert.equal(user.email, "maria@example.com");

  const enr = await db.all<{ status: string; cohort_id: string | null }>("SELECT status, cohort_id FROM enrollments WHERE user_id = ?", [user.id]);
  assert.equal(enr.length, 1);
  assert.equal(enr[0].status, "active");
  assert.ok(enr[0].cohort_id, "debe quedar en el grupo abierto");
  assert.equal((await getOrder(db, r.orderId))?.status, "paid");

  // El correo trae la cédula, un enlace para crear la contraseña, y los pasos.
  const mail = await lastEmail(db, buyer.email);
  assert.ok(mail);
  assert.match(mail.subject, /Bienvenida/);
  assert.match(mail.body_text, new RegExp(buyer.cedula));
  assert.ok(!/temporal/.test(mail.body_text), "ya no se envía una contraseña por correo");
  const token = /restablecer\?token=([\w-]+)/.exec(mail.body_text)?.[1];
  assert.ok(token, "el correo trae el enlace para crear la contraseña");

  // Sin crear la contraseña no se puede entrar (la cuenta nace con una clave que nadie conoce).
  assert.equal((await login(db, buyer.cedula, "cualquiera123", "9.9.9.9")).ok, false);

  // Con el enlace crea la suya (una sola vez) y entra.
  const userId = await consumePasswordReset(db, token);
  assert.equal(userId, user.id);
  assert.equal(await consumePasswordReset(db, token), undefined);
  await setPassword(db, user.id, "MiClaveNueva26");
  const entrada = await login(db, buyer.cedula, "MiClaveNueva26", "9.9.9.9");
  assert.ok(entrada.ok);
  if (entrada.ok) assert.equal(entrada.user.must_change_password, 0);
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

// ---------------------------------------------------------------- interesadas (leads) y atribución

import { cleanAttribution, createLead, listLeads } from "./leads.ts";

const lead = { programSlug: "hatha-vinyasa-yoga-y-meditacion", fullName: "Laura Mejía", email: "Laura@Example.com", whatsapp: "573001234567", interest: "info" as const, attribution: null, ip: "1.2.3.4" };

test("una persona interesada queda guardada con su correo en minúsculas", async () => {
  const db = await setup();
  assert.deepEqual(await createLead(db, lead), { ok: true, duplicate: false });
  const rows = await listLeads(db);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, "laura@example.com");
});

test("enviar dos veces lo mismo el mismo día no duplica la interesada", async () => {
  const db = await setup();
  await createLead(db, lead);
  assert.deepEqual(await createLead(db, lead), { ok: true, duplicate: true });
  assert.equal((await listLeads(db)).length, 1);
  // pero otro interés (lista de espera) sí es una solicitud distinta
  assert.deepEqual(await createLead(db, { ...lead, interest: "waitlist" }), { ok: true, duplicate: false });
});

test("una misma conexión no puede llenar la lista de spam: máximo 5 por hora", async () => {
  const db = await setup();
  for (let i = 0; i < 5; i++) assert.equal((await createLead(db, { ...lead, email: `p${i}@x.co` })).ok, true);
  assert.deepEqual(await createLead(db, { ...lead, email: "p6@x.co" }), { ok: false, error: "rate-limited" });
  assert.equal((await createLead(db, { ...lead, email: "otra@x.co", ip: "9.9.9.9" })).ok, true); // otra conexión sí
});

test("la atribución solo guarda texto corto y sencillo", () => {
  assert.equal(cleanAttribution('{"utm_source":"instagram","utm_campaign":"oct26"}'), '{"utm_source":"instagram","utm_campaign":"oct26"}');
  assert.equal(cleanAttribution("no es json"), null);
  assert.equal(cleanAttribution("[1,2]"), null);
  assert.equal(cleanAttribution(null), null);
  assert.equal(cleanAttribution("x".repeat(1000)), null);
  const limpio = JSON.parse(cleanAttribution('{"utm_source":"a","<script>":"x","utm_term":{"a":1}}') ?? "{}");
  assert.deepEqual(limpio, { utm_source: "a" }); // claves raras y valores que no son texto se descartan
});

test("el pedido guarda la campaña de origen", async () => {
  const db = await setup();
  const r = await createOrder(db, buyer, [SLUG], null, "demo", '{"utm_source":"google","utm_medium":"cpc"}');
  if (!r.ok) return assert.fail();
  const o = await db.get<{ attribution: string }>("SELECT attribution FROM orders WHERE id = ?", [r.orderId]);
  assert.match(o?.attribution ?? "", /google/);
});

// ---------------------------------------------------------------- reseñas de Google (sin red: respuestas simuladas)

import { combine, fetchGoogleReviews, parsePlace } from "./google-reviews.ts";

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
const placeBody = (name: string, rating: number, total: number, reviews: object[]) => ({
  id: "x", displayName: { text: name }, rating, userRatingCount: total, googleMapsUri: "https://maps.google.com/?cid=1", reviews,
});
const rev = (author: string, rating: number, text: string, publishTime = "2026-09-01T10:00:00Z") => ({ authorAttribution: { displayName: author, uri: "https://maps.google.com/u/1" }, rating, text: { text }, publishTime });
const TEXT = "Una experiencia muy bonita, aprendí muchísimo con las profesoras.";

test("reseñas de Google: se conservan las de 4-5 estrellas con texto real y se descartan el resto", () => {
  const { place, reviews } = parsePlace("Tabío", placeBody("Fullness Camp Tabío", 4.9, 120, [rev("Ana", 5, TEXT), rev("Beto", 2, TEXT), rev("Cami", 5, "Genial"), { rating: 5, text: { text: TEXT } }]));
  assert.equal(place.rating, 4.9);
  assert.equal(place.total, 120);
  assert.deepEqual(reviews.map((r) => r.author), ["Ana"]);
});

test("reseñas de Google: promedio ponderado por sede y máximo 2 reseñas por sede", () => {
  const a = parsePlace("Tabío", placeBody("FC Tabío", 5, 100, [rev("A1", 5, TEXT), rev("A2", 5, TEXT), rev("A3", 5, TEXT)]));
  const b = parsePlace("Cajicá", placeBody("FC Cajicá", 4, 100, [rev("B1", 4, TEXT)]));
  const data = combine([a, b]);
  assert.ok(data);
  assert.equal(data.rating, 4.5);
  assert.equal(data.total, 200);
  assert.equal(data.reviews.filter((r) => r.sede === "Tabío").length, 2);
  assert.equal(data.reviews.length, 3);
});

test("reseñas de Google: sin clave de API no se llama a Google y devuelve null", async () => {
  let llamadas = 0;
  const r = await fetchGoogleReviews({ apiKey: "", fetcher: () => { llamadas++; return ok({}); } });
  assert.equal(r, null);
  assert.equal(llamadas, 0);
});

test("reseñas de Google: busca por nombre, rechaza lugares que no son de Fullness Camp y sobrevive a una sede caída", async () => {
  const fetcher = (url: string, init?: RequestInit) => {
    if (url.includes("searchText")) {
      const q = JSON.parse(String(init?.body)).textQuery as string;
      if (q.includes("Tabio")) return ok({ places: [{ id: "T1", displayName: { text: "Fullness Camp sede TABIO" } }] });
      return ok({ places: [{ id: "OTRO", displayName: { text: "Peluquería Los Andes" } }] }); // no es de Fullness: se descarta
    }
    if (url.includes("/places/T1")) return ok(placeBody("Fullness Camp sede TABIO", 4.8, 40, [rev("Laura", 5, TEXT)]));
    return Promise.resolve(new Response("error", { status: 500 }));
  };
  const r = await fetchGoogleReviews({ apiKey: "k", fetcher });
  assert.ok(r);
  assert.deepEqual(r.places.map((p) => p.sede), ["Tabío"]);
  assert.equal(r.reviews[0].author, "Laura");
});

test("reseñas de Google: si todo falla devuelve null", async () => {
  const r = await fetchGoogleReviews({ apiKey: "k", fetcher: () => Promise.resolve(new Response("x", { status: 403 })) });
  assert.equal(r, null);
});
