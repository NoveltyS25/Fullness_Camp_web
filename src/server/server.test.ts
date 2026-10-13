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

// ---------------------------------------------------------------- quejas y denuncias

import { addBusinessDays, createComplaint, listComplaints, updateComplaint } from "./complaints.ts";

const complaint = { kind: "acoso" as const,  fullName: "Ana Ruiz", email: "Ana@Example.com", phone: null, accused: "Docente X", description: "Descripción de lo ocurrido con detalle suficiente.", eventDate: null, eventPlace: null, witnesses: null, ip: "9.9.9.9" };

test("una queja recibe radicado, queda confidencial en el panel y tiene plazo de 30 días hábiles", async () => {
  const db = await setup();
  const r = await createComplaint(db, complaint);
  assert.ok(r.ok && /^Q-\d{8}-[A-Z0-9]{5}$/.test(r.code));
  const [row] = await listComplaints(db);
  assert.equal(row.status, "recibida");
  assert.equal(row.email, "ana@example.com");
  assert.ok(new Date(row.due_at).getTime() > Date.now() + 40 * 24 * 3600_000); // 30 hábiles ≥ 42 días corridos
  assert.equal(await updateComplaint(db, row.id, "desestimada", "No está en el alcance."), true);
  assert.equal((await listComplaints(db))[0].status, "desestimada");
});

test("quejas: máximo 3 por hora desde la misma conexión", async () => {
  const db = await setup();
  for (let i = 0; i < 3; i++) assert.equal((await createComplaint(db, complaint)).ok, true);
  assert.deepEqual(await createComplaint(db, complaint), { ok: false, error: "rate-limited" });
});

test("los días hábiles saltan sábados y domingos", () => {
  assert.equal(addBusinessDays(new Date("2026-10-09T12:00:00Z"), 1).toISOString().slice(0, 10), "2026-10-12"); // viernes → lunes
});


// ---------------------------------------------------------------- clases propias de cada docente, pensum, horarios y certificado

import { createStaffAccount, getStudentSessions, rescheduleSession } from "./campus.ts";
import {
  addClassSessions, addModule, createClass, deleteClass, getClassStudents, getPensum, getProgramTeachers, listClasses, placeClass, unplaceClass, updateClass,
} from "./classes.ts";
import { getCertificate, setCourseCompleted } from "./curriculum.ts";
import { isPendingCedula } from "./users.ts";

const HATHA = "hatha-vinyasa-yoga-y-meditacion";
const PILATES = "certificacion-de-yoga-y-pilates";

async function classesSetup() {
  const db = await setup();
  const admin = await createUser(db, { cedula: "1", fullName: "Admin", email: "a@x.co", role: "admin", password: "Correcta123" });
  const t1 = await createUser(db, { cedula: "2", fullName: "Docente Uno", email: "t1@x.co", role: "teacher", password: "Correcta123" });
  const t2 = await createUser(db, { cedula: "3", fullName: "Docente Dos", email: "t2@x.co", role: "teacher", password: "Correcta123" });
  const stu = await createUser(db, { cedula: "4", fullName: "Estudiante", email: "s@x.co", role: "student", password: "Correcta123" });
  return { db, admin, t1, t2, stu };
}

async function enroll(db: Db, userId: string, programSlug: string) {
  const id = newId();
  await db.run("INSERT INTO enrollments (id, user_id, program_slug, status, created_at) VALUES (?, ?, ?, 'active', ?)", [id, userId, programSlug, nowIso()]);
  return id;
}

const FUTURE = { startsAt: "2099-03-02T23:00:00.000Z", endsAt: "2099-03-03T01:00:00.000Z" };

test("el pensum de Hatha se siembra una sola vez, con clases sin docente", async () => {
  const { db } = await classesSetup();
  const a = await getPensum(db, HATHA);
  const b = await getPensum(db, HATHA);
  assert.ok(a.length >= 5);
  assert.equal(a.flatMap((m) => m.classes).length, b.flatMap((m) => m.classes).length);
  assert.ok(a.every((m) => m.classes.every((c) => c.teacher_id === null)));
});

test("una docente crea su clase; una estudiante no; y no puede quedarse con la de otra", async () => {
  const { db, t1, t2, stu } = await classesSetup();
  assert.equal((await createClass(db, stu, { title: "Colada", modality: "virtual", description: "" })).ok, false);
  const made = await createClass(db, t1, { title: "Marketing", modality: "virtual", description: "", teacherId: t2.id }); // teacherId se ignora para docentes
  assert.ok(made.ok);
  assert.equal((await listClasses(db))[0].teacher_id, t1.id);
  assert.equal((await updateClass(db, t2, made.ok ? made.id : "", { title: "Mía ahora", modality: "virtual", description: "" })).ok, false);
  assert.equal((await createClass(db, t1, { title: "X", modality: "otra", description: "" })).ok, false);
});

test("la misma clase en dos certificaciones: sus estudiantes son las de ambas, con su certificación al lado", async () => {
  const { db, admin, t1, stu } = await classesSetup();
  const stu2 = await createUser(db, { cedula: "5", fullName: "Otra Estudiante", email: "s2@x.co", role: "student", password: "Correcta123" });
  const made = await createClass(db, t1, { title: "Marketing", modality: "virtual", description: "" });
  assert.ok(made.ok);
  const classId = made.ok ? made.id : "";
  await addModule(db, admin, PILATES, "Módulo 1");
  const hathaModule = (await getPensum(db, HATHA))[0].id;
  const pilatesModule = (await getPensum(db, PILATES))[0].id;
  assert.equal((await placeClass(db, t1, hathaModule, classId)).ok, false); // solo la administración arma certificaciones
  assert.deepEqual(await placeClass(db, admin, hathaModule, classId), { ok: true });
  assert.deepEqual(await placeClass(db, admin, pilatesModule, classId), { ok: true });
  assert.equal((await placeClass(db, admin, pilatesModule, classId)).ok, false); // repetida

  await enroll(db, stu.id, HATHA);
  await enroll(db, stu2.id, PILATES);
  const students = await getClassStudents(db, classId);
  assert.deepEqual(students.map((s) => `${s.full_name}:${s.program_slug}`).sort(), [`Estudiante:${HATHA}`, `Otra Estudiante:${PILATES}`]);
  assert.equal((await getProgramTeachers(db, HATHA))[0].full_name, "Docente Uno");
});

test("cambiar el horario de una clase avisa a las estudiantes de todas sus certificaciones", async () => {
  const { db, admin, t1, t2, stu } = await classesSetup();
  const stu2 = await createUser(db, { cedula: "5", fullName: "Otra", email: "s2@x.co", role: "student", password: "Correcta123" });
  const made = await createClass(db, t1, { title: "Marketing", modality: "virtual", description: "" });
  const classId = made.ok ? made.id : "";
  await addModule(db, admin, PILATES, "Módulo 1");
  await placeClass(db, admin, (await getPensum(db, HATHA))[0].id, classId);
  await placeClass(db, admin, (await getPensum(db, PILATES))[0].id, classId);
  await enroll(db, stu.id, HATHA);
  await enroll(db, stu2.id, PILATES);
  assert.deepEqual(await addClassSessions(db, t1, { classId, title: "", ...FUTURE, weeks: 3, location: null, onlineUrl: null }), { ok: true, created: 3 });
  assert.deepEqual(await addClassSessions(db, t2, { classId, title: "", ...FUTURE, weeks: 1, location: null, onlineUrl: null }), { ok: false, error: "No tienes permiso para cambiar los horarios de esta clase." });

  const mine = await getStudentSessions(db, stu.id);
  assert.equal(mine.length, 3);
  assert.equal(mine[0].class_title, "Marketing");
  const r = await rescheduleSession(db, t1, { sessionId: mine[0].id, startsAt: "2099-03-04T23:00:00.000Z", endsAt: "2099-03-05T01:00:00.000Z", location: null, onlineUrl: null, status: "scheduled", reason: "Viaje de la docente" });
  assert.deepEqual(r, { ok: true, notified: 2 });
  const n = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM notifications");
  assert.equal(Number(n?.n), 2);
  // otra docente no puede mover la sesión
  assert.equal((await rescheduleSession(db, t2, { sessionId: mine[1].id, startsAt: FUTURE.startsAt, endsAt: FUTURE.endsAt, location: null, onlineUrl: null, status: "cancelled", reason: "No debería" })).ok, false);
});

test("una estudiante con el curso terminado deja de ver sus clases; sin inscripción no ve ninguna", async () => {
  const { db, admin, t1, stu } = await classesSetup();
  const made = await createClass(db, t1, { title: "Marketing", modality: "virtual", description: "" });
  const classId = made.ok ? made.id : "";
  await placeClass(db, admin, (await getPensum(db, HATHA))[0].id, classId);
  await addClassSessions(db, t1, { classId, title: "", ...FUTURE, weeks: 2, location: null, onlineUrl: null });
  assert.equal((await getStudentSessions(db, stu.id)).length, 0);
  const eid = await enroll(db, stu.id, HATHA);
  assert.equal((await getStudentSessions(db, stu.id)).length, 2);
  await setCourseCompleted(db, admin, eid, true);
  assert.equal((await getStudentSessions(db, stu.id)).length, 0);
});

test("quitar una clase de la certificación no la borra; la docente no borra clases que están en una certificación", async () => {
  const { db, admin, t1 } = await classesSetup();
  const made = await createClass(db, t1, { title: "Marketing", modality: "virtual", description: "" });
  const classId = made.ok ? made.id : "";
  await placeClass(db, admin, (await getPensum(db, HATHA))[0].id, classId);
  assert.equal((await deleteClass(db, t1, classId)).ok, false);
  const placement = (await getPensum(db, HATHA)).flatMap((m) => m.classes).find((c) => c.class_id === classId)!.placement_id;
  assert.equal((await unplaceClass(db, t1, placement)).ok, false);
  assert.equal((await unplaceClass(db, admin, placement)).ok, true);
  assert.equal((await listClasses(db)).some((c) => c.id === classId), true);
  assert.equal((await deleteClass(db, t1, classId)).ok, true);
});

test("el certificado solo lo ve su dueña o la administración, y solo si el curso está terminado", async () => {
  const { db, admin, t1, stu } = await classesSetup();
  const eid = await enroll(db, stu.id, HATHA);
  assert.equal(await getCertificate(db, stu, eid), undefined);
  assert.equal((await setCourseCompleted(db, t1, eid, true)).ok, false);
  assert.equal((await setCourseCompleted(db, admin, eid, true)).ok, true);
  const cert = await getCertificate(db, stu, eid);
  assert.match(cert!.certificate_code, /^FC-[A-Z0-9]{8}$/);
  assert.equal(await getCertificate(db, t1, eid), undefined);
  assert.ok(await getCertificate(db, admin, eid));
});

// ---------------------------------------------------------------- docentes sin cédula

test("una docente se crea sin cédula con un código provisional que no sirve para ingresar", async () => {
  const db = await setup();
  const r = await createStaffAccount(db, { role: "admin" }, { cedula: null, fullName: "Docente Nueva", email: "Nueva@X.co", role: "teacher" }, "http://localhost:3000");
  assert.equal(r.ok, true);
  const row = await db.get<{ cedula: string }>("SELECT cedula FROM users WHERE email = ?", ["nueva@x.co"]);
  assert.ok(isPendingCedula(row!.cedula));
  assert.equal((await createStaffAccount(db, { role: "admin" }, { cedula: null, fullName: "Docente Nueva", email: "nueva@x.co", role: "teacher" }, "http://localhost:3000")).ok, false);
  assert.equal((await createStaffAccount(db, { role: "student" }, { cedula: null, fullName: "X", email: "x@x.co", role: "teacher" }, "http://localhost:3000")).ok, false);
});

// ---------------------------------------------------------------- crear una clase exige todos los datos y queda en el calendario

import { createClassWithSessions } from "./classes.ts";
import { getTeacherSessionsBetween } from "./campus.ts";

const newClass = { title: "Marketing", modality: "virtual", description: "Cómo darte a conocer.", teacherId: undefined, ...FUTURE, weeks: 2, location: "", onlineUrl: "https://meet.google.com/abc-defg-hij" };

test("crear una clase con su horario la deja de una vez en el calendario de la docente", async () => {
  const { db, t1 } = await classesSetup();
  const r = await createClassWithSessions(db, t1, newClass);
  assert.ok(r.ok);
  const sessions = await getTeacherSessionsBetween(db, t1.id, "2099-01-01T00:00:00.000Z", "2100-01-01T00:00:00.000Z");
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].class_title, "Marketing");
  assert.equal(sessions[0].online_url, "https://meet.google.com/abc-defg-hij");
});

test("una administradora que crea una clase desde su panel de docente la ve en su calendario", async () => {
  const { db, admin } = await classesSetup();
  const r = await createClassWithSessions(db, admin, { ...newClass, teacherId: admin.id });
  assert.ok(r.ok);
  assert.equal((await getTeacherSessionsBetween(db, admin.id, "2099-01-01T00:00:00.000Z", "2100-01-01T00:00:00.000Z")).length, 2);
  assert.equal((await listClasses(db))[0].teacher_name, "Admin");
});

test("crear una clase: todos los campos son obligatorios, según la modalidad", async () => {
  const { db, t1 } = await classesSetup();
  const fails = async (patch: Partial<typeof newClass>) => (await createClassWithSessions(db, t1, { ...newClass, ...patch })).ok === false;
  assert.ok(await fails({ title: "" }));
  assert.ok(await fails({ description: "" }));
  assert.ok(await fails({ modality: "otra" }));
  assert.ok(await fails({ onlineUrl: "" })); // virtual pide el enlace
  assert.ok(await fails({ onlineUrl: "no-es-un-enlace" }));
  assert.ok(await fails({ weeks: 0 }));
  assert.ok(await fails({ endsAt: FUTURE.startsAt })); // fin igual al inicio
  assert.ok(await fails({ modality: "presencial", location: "", onlineUrl: "" })); // presencial pide el lugar
  assert.ok(await fails({ modality: "mixta", location: "Sede Bogotá", onlineUrl: "" })); // mixta pide los dos
  assert.equal((await listClasses(db)).length, 0, "ninguna clase a medias");
  assert.ok((await createClassWithSessions(db, t1, { ...newClass, modality: "presencial", location: "Sede Bogotá", onlineUrl: "" })).ok);
  assert.ok((await createClassWithSessions(db, t1, { ...newClass, modality: "mixta", location: "Sede Bogotá" })).ok);
});

// ---------------------------------------------------------------- calendario de la estudiante por certificación

import { getStudentSessionsBetween } from "./campus.ts";

test("el horario mensual de la estudiante muestra solo la certificación elegida y exige inscripción activa", async () => {
  const { db, admin, t1, stu } = await classesSetup();
  const a = await createClass(db, t1, { title: "Anatomía", modality: "virtual", description: "" });
  const b = await createClass(db, t1, { title: "Marketing", modality: "virtual", description: "" });
  await addModule(db, admin, PILATES, "Módulo 1");
  await placeClass(db, admin, (await getPensum(db, HATHA))[0].id, a.ok ? a.id : "");
  await placeClass(db, admin, (await getPensum(db, HATHA))[0].id, b.ok ? b.id : "");
  await placeClass(db, admin, (await getPensum(db, PILATES))[0].id, b.ok ? b.id : ""); // Marketing está en las dos
  for (const c of [a, b]) await addClassSessions(db, t1, { classId: c.ok ? c.id : "", title: "", ...FUTURE, weeks: 1, location: null, onlineUrl: null });
  const range = ["2099-03-01T05:00:00.000Z", "2099-04-01T05:00:00.000Z"] as const;

  assert.equal((await getStudentSessionsBetween(db, stu.id, HATHA, ...range)).length, 0, "sin inscripción no ve nada");
  const hathaEnrollment = await enroll(db, stu.id, HATHA);
  await enroll(db, stu.id, PILATES);
  assert.deepEqual((await getStudentSessionsBetween(db, stu.id, HATHA, ...range)).map((s) => s.class_title).sort(), ["Anatomía", "Marketing"]);
  assert.deepEqual((await getStudentSessionsBetween(db, stu.id, PILATES, ...range)).map((s) => s.class_title), ["Marketing"]);
  assert.equal((await getStudentSessionsBetween(db, stu.id, HATHA, "2099-05-01T05:00:00.000Z", "2099-06-01T05:00:00.000Z")).length, 0, "otro mes");
  await setCourseCompleted(db, admin, hathaEnrollment, true);
  assert.equal((await getStudentSessionsBetween(db, stu.id, HATHA, ...range)).length, 0, "curso terminado: ya no tiene clases");
});

// ---------------------------------------------------------------- Anatomía y biomecánica (Alexa): temario por clases con horario propio

import { addLesson, deleteLesson, getClassLessons, scheduleLesson } from "./classes.ts";

const ANATOMIA = "Anatomía y biomecánica del yoga";

async function anatomiaClass(db: Db) {
  const row = (await listClasses(db)).find((c) => c.title === ANATOMIA)!;
  return row;
}

test("el pensum de Hatha trae «Anatomía y biomecánica del yoga» con 8 clases y su docente prevista", async () => {
  const { db } = await classesSetup();
  await getPensum(db, HATHA);
  const c = await anatomiaClass(db);
  assert.equal(c.teacher_id, null);
  const lessons = await getClassLessons(db, c.id);
  assert.equal(lessons.length, 8);
  assert.match(lessons[0].title, /^Clase 1/);
  assert.match(lessons[7].title, /^Clase 8/);
  assert.ok(lessons[6].topics.includes("Respiración consciente"));
  assert.ok(lessons.every((l) => l.starts_at === null), "sin horario hasta que la docente lo ponga");
});

test("al crear la cuenta de Alexa, la clase de Anatomía queda a su nombre", async () => {
  const { db } = await classesSetup();
  await getPensum(db, HATHA);
  assert.equal((await anatomiaClass(db)).teacher_id, null);
  assert.equal((await createStaffAccount(db, { role: "admin" }, { cedula: null, fullName: "Alexa Pabón", email: "Alexa24alexa10@gmail.com", role: "teacher" }, "http://localhost:3000")).ok, true);
  const c = await anatomiaClass(db);
  assert.equal(c.teacher_name, "Alexa Pabón");
  assert.equal(c.teacher_id !== null, true);
});

test("la docente le pone horario a cada clase del temario; una sola vez por clase y solo ella", async () => {
  const { db, t2, stu, admin } = await classesSetup();
  await getPensum(db, HATHA);
  const alexa = await createUser(db, { cedula: "9", fullName: "Alexa", email: "alexa24alexa10@gmail.com", role: "teacher", password: "Correcta123" });
  await db.run("UPDATE classes SET teacher_id = ? WHERE title = ?", [alexa.id, ANATOMIA]);
  const c = await anatomiaClass(db);
  const [l1, l2] = await getClassLessons(db, c.id);
  const at = { startsAt: FUTURE.startsAt, endsAt: FUTURE.endsAt, location: "", onlineUrl: "https://meet.google.com/abc-defg-hij" };

  assert.equal((await scheduleLesson(db, t2, { lessonId: l1.id, ...at })).ok, false, "otra docente no puede");
  assert.equal((await scheduleLesson(db, alexa, { lessonId: l1.id, ...at, onlineUrl: "" })).ok, false, "virtual pide el enlace");
  assert.equal((await scheduleLesson(db, alexa, { lessonId: l1.id, ...at, endsAt: at.startsAt })).ok, false);
  assert.deepEqual(await scheduleLesson(db, alexa, { lessonId: l1.id, ...at }), { ok: true });
  assert.equal((await scheduleLesson(db, alexa, { lessonId: l1.id, ...at })).ok, false, "ya tiene horario");
  assert.deepEqual(await scheduleLesson(db, alexa, { lessonId: l2.id, ...at, startsAt: "2099-03-09T23:00:00.000Z", endsAt: "2099-03-10T01:00:00.000Z" }), { ok: true });

  const lessons = await getClassLessons(db, c.id);
  assert.equal(lessons.filter((l) => l.starts_at).length, 2);
  // la estudiante de Hatha ve la clase con los temas del encuentro
  await enroll(db, stu.id, HATHA);
  const mine = await getStudentSessions(db, stu.id);
  assert.equal(mine.length, 2);
  assert.match(mine[0].lesson_topics ?? "", /Concepto de cuerpo/);
  assert.equal(mine[0].title, l1.title);
  // quitar una clase del temario borra su horario
  assert.equal((await deleteLesson(db, t2, l2.id)).ok, false);
  assert.equal((await deleteLesson(db, alexa, l2.id)).ok, true);
  assert.equal((await getStudentSessions(db, stu.id)).length, 1);
  assert.equal((await addLesson(db, alexa, c.id, "Clase 9: Repaso", "Tema A\nTema B")).ok, true);
  assert.equal((await getClassLessons(db, c.id)).length, 8);
  void admin;
});

// ---------------------------------------------------------------- Filosofía del yoga (Nitya): 3 módulos, 10 clases

test("el pensum de Hatha trae Filosofía del yoga: 3 módulos y 10 clases de Nitya", async () => {
  const { db } = await classesSetup();
  const modules = await getPensum(db, HATHA);
  const filo = modules.filter((m) => m.title.startsWith("Filosofía del yoga:"));
  assert.deepEqual(filo.map((m) => m.classes.length), [2, 3, 5]);
  assert.equal(modules[0].title, "Filosofía del yoga: Historia", "van primero");
  const titles = filo.flatMap((m) => m.classes.map((c) => c.title));
  assert.ok(titles.includes("Los 6 Darshanas") && titles.includes("Karma") && titles.includes("Gunas"));
  assert.ok(filo.every((m) => m.classes.every((c) => c.teacher_id === null)), "sin cuenta aún, sin docente");
  assert.equal(modules.some((m) => m.classes.some((c) => c.title === "Historia y filosofía")), false);
});

test("al crear la cuenta de Nitya, sus 10 clases quedan a su nombre y a nadie más", async () => {
  const { db } = await classesSetup();
  await getPensum(db, HATHA);
  await createStaffAccount(db, { role: "admin" }, { cedula: null, fullName: "Nitya", email: "Nitya.Portal@gmail.com", role: "teacher" }, "http://localhost:3000");
  const mine = (await listClasses(db)).filter((c) => c.teacher_name === "Nitya");
  assert.equal(mine.length, 10);
  const alexa = (await listClasses(db)).find((c) => c.title === ANATOMIA)!;
  assert.equal(alexa.teacher_id, null, "Anatomía sigue esperando a Alexa");
});
