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



// ---------------------------------------------------------------- organización de los 5 certificados, ciclos, suplencias y avance

import { createStaffAccount, getStudentSessions, getStudentSessionsBetween, getTeacherSessionsBetween, rescheduleSession, setCanGrade } from "./campus.ts";
import {
  addClassSessions, addLesson, addModule, createClass, createClassWithSessions, deleteClass, deleteLesson, getClassLessons, getClassStudents,
  getClassStudentsProgress, getPensum, getProgramTeachers, getStudentProgress, getTeacherClasses, listClasses, placeClass, scheduleLesson, setClassProgress,
  unplaceClass, updateClass,
} from "./classes.ts";
import { cancelCover, incomingCoverRequests, listCoverCandidates, requestCover, respondCover } from "./covers.ts";
import { closeCycle, cycleNameFor, getCycleClasses, startCycle } from "./cycles.ts";
import { getCertificate, setCourseCompleted } from "./curriculum.ts";
import { isPendingCedula } from "./users.ts";

const HATHA = "hatha-vinyasa-yoga-y-meditacion";
const HATHA200 = "the-happiness-program-3";
const PILATES = "certificacion-de-yoga-y-pilates";
const KIDS = "certificacion-de-yoga-kids-y-yoga-prenatal";
const MAESTRIA = "maestria-yogaayurveda-mujer";
const FUTURE = { startsAt: "2099-03-02T23:00:00.000Z", endsAt: "2099-03-03T01:00:00.000Z" };

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

const cycle = async (db: Db, who: { id: string; role: "teacher" | "admin" | "student" }, now = new Date("2099-02-10T15:00:00Z")) => {
  const r = await startCycle(db, who, "2099-03-01", now);
  assert.ok(r.ok);
  return r.ok ? r : (undefined as never);
};

const account = (db: Db, name: string, email: string) => createStaffAccount(db, { role: "admin" }, { cedula: null, fullName: name, email, role: "teacher" }, "http://localhost:3000");
const allClasses = async (db: Db, slug: string) => (await getPensum(db, slug)).flatMap((m) => m.classes);
const byTitle = async (db: Db, title: string) => (await listClasses(db)).find((c) => c.title === title)!;
const notifCount = async (db: Db, userId: string) => Number((await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?", [userId]))?.n);

// ---- la organización de los 5 certificados

test("los 5 certificados se arman en «Módulo 1», «Módulo 2»… con las asignaturas del documento de organización", async () => {
  const { db } = await classesSetup();
  const counts = {} as Record<string, number>;
  for (const slug of [KIDS, HATHA200, PILATES, HATHA, MAESTRIA]) {
    const modules = await getPensum(db, slug);
    counts[slug] = modules.length;
    assert.deepEqual(modules.map((m) => m.title), modules.map((_, i) => `Módulo ${i + 1}`));
  }
  assert.deepEqual(counts, { [KIDS]: 10, [HATHA200]: 8, [PILATES]: 9, [HATHA]: 8, [MAESTRIA]: 7 });
  const m1 = (await getPensum(db, MAESTRIA))[0];
  assert.deepEqual(m1.classes.map((c) => c.title), ["Fundamentos del yoga", "Introducción al Ayurveda", "Fundamentos de medicina Ayurveda"]);
  const hatha = (await allClasses(db, HATHA)).map((c) => c.title);
  assert.ok(hatha.includes("Meditación y respiración") && !hatha.includes("Integración emocional"), "Hatha 300 lleva meditación y no integración emocional");
  assert.ok((await allClasses(db, PILATES)).some((c) => c.title === "Pilates"));
});

test("una asignatura compartida se crea una sola vez, con sus clases, y es la misma en todos los certificados", async () => {
  const { db } = await classesSetup();
  await getPensum(db, MAESTRIA);
  const ids = new Set<string>();
  for (const slug of [HATHA200, PILATES, HATHA]) ids.add((await allClasses(db, slug)).find((c) => c.title === "Historia y filosofía")!.class_id);
  assert.equal(ids.size, 1);
  const historia = await byTitle(db, "Historia y filosofía");
  assert.equal((await getClassLessons(db, historia.id)).length, 10);
  assert.deepEqual(historia.programs.sort(), [HATHA, HATHA200, PILATES].sort());
  const marketing = await byTitle(db, "El yoga como fuente de ingresos y de servicio");
  assert.equal((await getClassLessons(db, marketing.id)).length, 4, "4 clases: un ciclo de un mes, una por semana");
  const bio = await byTitle(db, "Biomecánica aplicada al yoga");
  assert.equal((await getClassLessons(db, bio.id)).length, 8);
  assert.equal((await getClassLessons(db, (await byTitle(db, "Ciclo lunar: 16 meditaciones")).id)).length, 16);
  const retiro = await byTitle(db, "Retiro de yoga y meditación");
  assert.equal(retiro.is_event, 1);
  assert.equal(retiro.modality, "presencial");
});

test("al crear la cuenta de cada docente, sus asignaturas quedan a su nombre; las compartidas, con las dos docentes", async () => {
  const { db } = await classesSetup();
  await getPensum(db, MAESTRIA);
  await getPensum(db, KIDS);
  await account(db, "Lila Govardhan", "academicofullnesscamp@fullnesscamp.com");
  await account(db, "Dra. Celi", "DraCelyMargarita@gmail.com");
  await account(db, "Diana Flores", "flormoramar6@gmail.com");
  await account(db, "William Feragotto", "williamferagotto@gmail.com");

  const lunar = await byTitle(db, "Ciclo lunar: 16 meditaciones");
  assert.equal(lunar.teacher_name, "Lila Govardhan y Dra. Celi");
  assert.equal((await byTitle(db, "Cosmética natural")).teacher_name, "Lila Govardhan y William Feragotto");
  assert.equal((await byTitle(db, "Retiro de Yoga Kids y Prenatal")).teacher_name, "Lila Govardhan y Diana Flores");
  const celi = (await db.get<{ id: string }>("SELECT id FROM users WHERE email = 'dracelymargarita@gmail.com'"))!;
  assert.deepEqual((await getTeacherClasses(db, celi.id)).map((c) => c.title).sort(), ["Ciclo lunar: 16 meditaciones", "Fundamentos de medicina Ayurveda"]);
  assert.equal((await byTitle(db, "Hipopresivos")).teacher_id, null, "Susana aún no tiene cuenta");
  assert.ok((await getProgramTeachers(db, MAESTRIA)).some((t) => t.full_name === "William Feragotto"));
});

test("si la cuenta ya existía cuando se siembra el certificado, la asignatura nace a su nombre", async () => {
  const { db } = await classesSetup();
  await account(db, "Lila Govardhan", "academicofullnesscamp@fullnesscamp.com");
  await account(db, "Dra. Celi", "dracelymargarita@gmail.com");
  const lunar = (await allClasses(db, MAESTRIA)).find((c) => c.title === "Ciclo lunar: 16 meditaciones")!;
  assert.equal(lunar.teacher_name, "Lila Govardhan y Dra. Celi");
});

// ---- ciclos

test("el ciclo se llama como el mes y el año en que se crea; iniciar otro cierra el anterior", async () => {
  const { db, t1 } = await classesSetup();
  assert.equal(cycleNameFor(new Date("2027-10-14T15:00:00Z")), "Octubre 2027");
  assert.equal(cycleNameFor(new Date("2027-01-01T03:00:00Z")), "Diciembre 2026", "en hora de Colombia todavía es 31 de diciembre");
  const a = await cycle(db, t1, new Date("2027-10-14T15:00:00Z"));
  assert.equal(a.name, "Octubre 2027");
  const b = await cycle(db, t1, new Date("2027-10-28T15:00:00Z"));
  assert.equal(b.name, "Octubre 2027 (2)", "dos ciclos en el mismo mes no se confunden");
  const active = await db.all<{ name: string }>("SELECT name FROM teacher_cycles WHERE teacher_id = ? AND status = 'activo'", [t1.id]);
  assert.deepEqual(active.map((c) => c.name), ["Octubre 2027 (2)"]);
  assert.equal((await startCycle(db, t1, "no-es-fecha")).ok, false);
  assert.equal((await closeCycle(db, t1, b.id)).ok, true);
  assert.equal((await closeCycle(db, t1, b.id)).ok, false);
});

test("programar clases exige tener el ciclo activo; los retiros no dependen del ciclo y la administración los programa cuando quiera", async () => {
  const { db, admin, t1 } = await classesSetup();
  await account(db, "Lila", "academicofullnesscamp@fullnesscamp.com");
  const lila = (await db.get<{ id: string; role: "teacher" }>("SELECT id, role FROM users WHERE email = 'academicofullnesscamp@fullnesscamp.com'"))!;
  await getPensum(db, HATHA);
  const fundamentos = await byTitle(db, "Fundamentos del yoga");
  const retiro = await byTitle(db, "Retiro de yoga y meditación");
  const [lesson] = await getClassLessons(db, fundamentos.id);
  const at = { startsAt: FUTURE.startsAt, endsAt: FUTURE.endsAt, location: "", onlineUrl: "https://meet.google.com/abc-defg-hij" };

  const sinCiclo = await scheduleLesson(db, lila, { lessonId: lesson.id, ...at });
  assert.equal(sinCiclo.ok, false);
  assert.match(sinCiclo.ok ? "" : sinCiclo.error, /inicia tu ciclo/i);
  await cycle(db, lila);
  assert.deepEqual(await scheduleLesson(db, lila, { lessonId: lesson.id, ...at }), { ok: true });
  const row = await db.get<{ cycle_id: string | null }>("SELECT cycle_id FROM sessions WHERE class_id = ?", [fundamentos.id]);
  assert.ok(row?.cycle_id, "la clase quedó dentro del ciclo");

  // retiro: sin ciclo (la docente aunque no tenga) y por la administración
  const [taller] = await getClassLessons(db, retiro.id);
  assert.equal((await scheduleLesson(db, t1, { lessonId: taller.id, ...at, location: "Tabío" })).ok, false, "otra docente no puede");
  assert.deepEqual(await scheduleLesson(db, admin, { lessonId: taller.id, ...at, location: "Tabío", onlineUrl: "" }), { ok: true });
  const ev = await db.get<{ cycle_id: string | null }>("SELECT cycle_id FROM sessions WHERE class_id = ?", [retiro.id]);
  assert.equal(ev?.cycle_id, null);
  // la administración programando la clase de otra docente tampoco necesita ciclo propio
  const [l2] = (await getClassLessons(db, fundamentos.id)).slice(1);
  assert.deepEqual(await scheduleLesson(db, admin, { lessonId: l2.id, ...at }), { ok: true });
});

test("las estudiantes ven solo el ciclo activo; quien aprobó la asignatura no ve más sus horarios y quien no, la ve de nuevo", async () => {
  const { db, admin, t1, stu } = await classesSetup();
  const stu2 = await createUser(db, { cedula: "6", fullName: "Otra", email: "s6@x.co", role: "student", password: "Correcta123" });
  const made = await createClass(db, t1, { title: "Anatomía", modality: "virtual", description: "" });
  const classId = made.ok ? made.id : "";
  await placeClass(db, admin, (await getPensum(db, HATHA))[0].id, classId);
  await enroll(db, stu.id, HATHA);
  await enroll(db, stu2.id, HATHA);

  const c1 = await cycle(db, t1, new Date("2099-02-10T15:00:00Z"));
  await addClassSessions(db, t1, { classId, title: "", startsAt: "2020-01-07T23:00:00.000Z", endsAt: "2020-01-08T01:00:00.000Z", weeks: 2, location: null, onlineUrl: null });
  assert.equal((await getStudentSessions(db, stu.id)).length, 0, "sesiones pasadas no se listan como próximas");
  const range = ["2020-01-01T05:00:00.000Z", "2020-03-01T05:00:00.000Z"] as const;
  assert.equal((await getStudentSessionsBetween(db, stu.id, HATHA, ...range)).length, 2);

  // la docente aprueba a una y no aprueba a la otra
  assert.deepEqual(await setClassProgress(db, t1, classId, stu.id, "aprobado"), { ok: true });
  assert.deepEqual(await setClassProgress(db, t1, classId, stu2.id, "no_aprobado"), { ok: true });
  assert.equal((await getStudentSessionsBetween(db, stu.id, HATHA, ...range)).length, 0, "la que aprobó ya no ve los horarios");
  assert.equal((await getStudentSessionsBetween(db, stu2.id, HATHA, ...range)).length, 2);
  const hist = await db.all<{ status: string; cycle_id: string | null }>("SELECT status, cycle_id FROM class_results WHERE class_id = ? ORDER BY status", [classId]);
  assert.deepEqual(hist.map((h) => h.status), ["aprobado", "no_aprobado"]);
  assert.ok(hist.every((h) => h.cycle_id === c1.id), "el resultado queda anotado con su ciclo");

  // ciclo nuevo: los horarios del anterior se esconden y quien no aprobó vuelve a empezar
  const c2 = await cycle(db, t1, new Date("2099-06-10T15:00:00Z"));
  assert.notEqual(c2.id, c1.id);
  assert.equal((await getStudentSessionsBetween(db, stu2.id, HATHA, ...range)).length, 0, "el ciclo anterior está cerrado");
  await addClassSessions(db, t1, { classId, title: "", ...FUTURE, weeks: 2, location: null, onlineUrl: null });
  const future = ["2099-03-01T05:00:00.000Z", "2099-04-01T05:00:00.000Z"] as const;
  assert.equal((await getStudentSessionsBetween(db, stu2.id, HATHA, ...future)).length, 2, "quien no aprobó la ve en el ciclo nuevo");
  assert.equal((await getStudentSessionsBetween(db, stu.id, HATHA, ...future)).length, 0, "quien aprobó no la vuelve a ver");
  const prog = await getStudentProgress(db, stu2.id, HATHA);
  assert.equal(prog.modules.flatMap((m) => m.classes).find((c) => c.class_id === classId)!.decided, false, "su «no aprobada» anterior se reinició");
  assert.equal(prog.modules.flatMap((m) => m.classes).find((c) => c.class_id === classId)!.status, "pendiente");
  assert.equal((await getStudentProgress(db, stu.id, HATHA)).approved, 1, "la aprobada se conserva");
});

test("el panel del ciclo muestra, por asignatura, dónde aparece y cuántas clases ya tienen fecha", async () => {
  const { db } = await classesSetup();
  await account(db, "Lila", "academicofullnesscamp@fullnesscamp.com");
  await getPensum(db, HATHA);
  await getPensum(db, MAESTRIA);
  const lila = (await db.get<{ id: string; role: "teacher" }>("SELECT id, role FROM users WHERE email = 'academicofullnesscamp@fullnesscamp.com'"))!;
  const c = await cycle(db, lila);
  const [l1] = await getClassLessons(db, (await byTitle(db, "Fundamentos del yoga")).id);
  await scheduleLesson(db, lila, { lessonId: l1.id, startsAt: FUTURE.startsAt, endsAt: FUTURE.endsAt, location: "", onlineUrl: "https://meet.google.com/abc-defg-hij" });
  const overview = await getCycleClasses(db, lila.id, c.id);
  const f = overview.find((x) => x.title === "Fundamentos del yoga")!;
  assert.equal(f.scheduled, 1);
  assert.equal(f.lessons_total, 8);
  assert.deepEqual(f.placements.map((p) => p.program_slug).sort(), [HATHA, MAESTRIA].sort());
  assert.ok(overview.some((x) => x.is_event === 1 && x.title === "Retiro de yoga y meditación"));
});

// ---- clases de las docentes, temario y permisos

test("una docente crea su clase con su primer horario (necesita ciclo); una estudiante no; no se la puede quitar a otra", async () => {
  const { db, t1, t2, stu } = await classesSetup();
  assert.equal((await createClass(db, stu, { title: "Colada", modality: "virtual", description: "" })).ok, false);
  const made = await createClass(db, t1, { title: "Marketing 1", modality: "virtual", description: "", teacherId: t2.id }); // teacherId se ignora para docentes
  assert.ok(made.ok);
  assert.equal((await byTitle(db, "Marketing 1")).teacher_id, t1.id);
  assert.equal((await updateClass(db, t2, made.ok ? made.id : "", { title: "Mía ahora", modality: "virtual", description: "" })).ok, false);
  assert.equal((await createClass(db, t1, { title: "X", modality: "otra", description: "" })).ok, false);
});

const newClass = { title: "Taller propio", modality: "virtual", description: "Descripción de la clase.", teacherId: undefined, ...FUTURE, weeks: 2, location: "", onlineUrl: "https://meet.google.com/abc-defg-hij" };

test("crear una clase con su horario la deja en el calendario de la docente, siempre que tenga ciclo", async () => {
  const { db, t1, admin } = await classesSetup();
  assert.equal((await createClassWithSessions(db, t1, newClass)).ok, false, "sin ciclo no se programa");
  assert.equal((await listClasses(db)).length, 0, "ninguna clase a medias");
  await cycle(db, t1);
  const r = await createClassWithSessions(db, t1, newClass);
  assert.ok(r.ok);
  const sessions = await getTeacherSessionsBetween(db, t1.id, "2099-01-01T00:00:00.000Z", "2100-01-01T00:00:00.000Z");
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].cycle_name, "Febrero 2099");
  // una administradora que dicta lo suyo desde su panel de docente funciona igual
  await cycle(db, admin);
  const mine = await createClassWithSessions(db, admin, { ...newClass, title: "De la administradora", teacherId: admin.id });
  assert.ok(mine.ok);
  assert.equal((await getTeacherSessionsBetween(db, admin.id, "2099-01-01T00:00:00.000Z", "2100-01-01T00:00:00.000Z")).length, 2);
});

test("crear una clase: todos los campos son obligatorios, según la modalidad", async () => {
  const { db, t1 } = await classesSetup();
  await cycle(db, t1);
  const fails = async (patch: Partial<typeof newClass>) => (await createClassWithSessions(db, t1, { ...newClass, ...patch })).ok === false;
  assert.ok(await fails({ title: "" }));
  assert.ok(await fails({ description: "" }));
  assert.ok(await fails({ modality: "otra" }));
  assert.ok(await fails({ onlineUrl: "" }));
  assert.ok(await fails({ onlineUrl: "no-es-un-enlace" }));
  assert.ok(await fails({ weeks: 0 }));
  assert.ok(await fails({ endsAt: FUTURE.startsAt }));
  assert.ok(await fails({ modality: "presencial", location: "", onlineUrl: "" }));
  assert.ok(await fails({ modality: "mixta", location: "Sede Bogotá", onlineUrl: "" }));
  assert.equal((await listClasses(db)).length, 0, "ninguna clase a medias");
  assert.ok((await createClassWithSessions(db, t1, { ...newClass, modality: "presencial", location: "Sede Bogotá", onlineUrl: "" })).ok);
  assert.ok((await createClassWithSessions(db, t1, { ...newClass, modality: "mixta", location: "Sede Bogotá" })).ok);
});

test("la docente le pone horario a cada clase del temario; una sola vez por ciclo y solo ella", async () => {
  const { db, t2, stu } = await classesSetup();
  await account(db, "Alexa", "alexa24alexa10@gmail.com");
  const alexa = (await db.get<{ id: string; role: "teacher" }>("SELECT id, role FROM users WHERE email = 'alexa24alexa10@gmail.com'"))!;
  const c = (await allClasses(db, HATHA)).find((x) => x.title === "Biomecánica aplicada al yoga")!;
  assert.equal(c.teacher_name, "Alexa");
  const [l1, l2] = await getClassLessons(db, c.class_id);
  const at = { startsAt: FUTURE.startsAt, endsAt: FUTURE.endsAt, location: "", onlineUrl: "https://meet.google.com/abc-defg-hij" };
  await cycle(db, alexa);

  assert.equal((await scheduleLesson(db, t2, { lessonId: l1.id, ...at })).ok, false, "otra docente no puede");
  assert.equal((await scheduleLesson(db, alexa, { lessonId: l1.id, ...at, onlineUrl: "" })).ok, false, "virtual pide el enlace");
  assert.equal((await scheduleLesson(db, alexa, { lessonId: l1.id, ...at, endsAt: at.startsAt })).ok, false);
  assert.deepEqual(await scheduleLesson(db, alexa, { lessonId: l1.id, ...at }), { ok: true });
  assert.equal((await scheduleLesson(db, alexa, { lessonId: l1.id, ...at })).ok, false, "ya tiene horario");
  assert.deepEqual(await scheduleLesson(db, alexa, { lessonId: l2.id, ...at, startsAt: "2099-03-09T23:00:00.000Z", endsAt: "2099-03-10T01:00:00.000Z" }), { ok: true });

  await enroll(db, stu.id, HATHA);
  const mine = await getStudentSessions(db, stu.id);
  assert.equal(mine.length, 2);
  assert.match(mine[0].lesson_topics ?? "", /Concepto de cuerpo/);
  assert.equal(mine[0].teacher_name, "Alexa");
  assert.equal((await deleteLesson(db, t2, l2.id)).ok, false);
  assert.equal((await deleteLesson(db, alexa, l2.id)).ok, true);
  assert.equal((await getStudentSessions(db, stu.id)).length, 1);
  assert.equal((await addLesson(db, alexa, c.class_id, "Clase 9: Repaso", "Tema A\nTema B")).ok, true);
  assert.equal((await getClassLessons(db, c.class_id)).length, 8);
});

test("cambiar el horario de una clase avisa a las estudiantes que aún no la aprobaron, de todos los certificados", async () => {
  const { db, admin, t1, t2, stu } = await classesSetup();
  const stu2 = await createUser(db, { cedula: "5", fullName: "Otra", email: "s2@x.co", role: "student", password: "Correcta123" });
  const stu3 = await createUser(db, { cedula: "7", fullName: "Ya aprobó", email: "s7@x.co", role: "student", password: "Correcta123" });
  const made = await createClass(db, t1, { title: "Marketing", modality: "virtual", description: "" });
  const classId = made.ok ? made.id : "";
  await placeClass(db, admin, (await getPensum(db, HATHA))[0].id, classId);
  await placeClass(db, admin, (await getPensum(db, PILATES))[0].id, classId);
  await enroll(db, stu.id, HATHA);
  await enroll(db, stu2.id, PILATES);
  await enroll(db, stu3.id, HATHA);
  await cycle(db, t1);
  assert.deepEqual(await addClassSessions(db, t1, { classId, title: "", ...FUTURE, weeks: 3, location: null, onlineUrl: null }), { ok: true, created: 3 });
  assert.equal((await addClassSessions(db, t2, { classId, title: "", ...FUTURE, weeks: 1, location: null, onlineUrl: null })).ok, false);
  await setClassProgress(db, t1, classId, stu3.id, "aprobado");

  const mine = await getStudentSessions(db, stu.id);
  assert.equal(mine.length, 3);
  assert.equal(mine[0].class_title, "Marketing");
  assert.equal((await getStudentSessions(db, stu3.id)).length, 0);
  const r = await rescheduleSession(db, t1, { sessionId: mine[0].id, startsAt: "2099-03-04T23:00:00.000Z", endsAt: "2099-03-05T01:00:00.000Z", location: null, onlineUrl: null, status: "scheduled", reason: "Viaje de la docente" });
  assert.deepEqual(r, { ok: true, notified: 2 });
  assert.equal(await notifCount(db, stu3.id), 0);
  assert.equal((await rescheduleSession(db, t2, { sessionId: mine[1].id, startsAt: FUTURE.startsAt, endsAt: FUTURE.endsAt, location: null, onlineUrl: null, status: "cancelled", reason: "No debería" })).ok, false);
});

test("una estudiante con el curso terminado deja de ver sus clases", async () => {
  const { db, admin, t1, stu } = await classesSetup();
  const made = await createClass(db, t1, { title: "Marketing", modality: "virtual", description: "" });
  const classId = made.ok ? made.id : "";
  await placeClass(db, admin, (await getPensum(db, HATHA))[0].id, classId);
  await cycle(db, t1);
  await addClassSessions(db, t1, { classId, title: "", ...FUTURE, weeks: 2, location: null, onlineUrl: null });
  assert.equal((await getStudentSessions(db, stu.id)).length, 0);
  const eid = await enroll(db, stu.id, HATHA);
  assert.equal((await getStudentSessions(db, stu.id)).length, 2);
  await setCourseCompleted(db, admin, eid, true);
  assert.equal((await getStudentSessions(db, stu.id)).length, 0);
});

test("quitar una clase del certificado no la borra; la docente no borra clases que están en un certificado", async () => {
  const { db, admin, t1 } = await classesSetup();
  const made = await createClass(db, t1, { title: "Marketing", modality: "virtual", description: "" });
  const classId = made.ok ? made.id : "";
  await placeClass(db, admin, (await getPensum(db, HATHA))[0].id, classId);
  assert.equal((await deleteClass(db, t1, classId)).ok, false);
  const placement = (await allClasses(db, HATHA)).find((c) => c.class_id === classId)!.placement_id;
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

test("una docente se crea sin cédula con un código provisional que no sirve para ingresar", async () => {
  const db = await setup();
  const r = await createStaffAccount(db, { role: "admin" }, { cedula: null, fullName: "Docente Nueva", email: "Nueva@X.co", role: "teacher" }, "http://localhost:3000");
  assert.equal(r.ok, true);
  const row = await db.get<{ cedula: string }>("SELECT cedula FROM users WHERE email = ?", ["nueva@x.co"]);
  assert.ok(isPendingCedula(row!.cedula));
  assert.equal((await createStaffAccount(db, { role: "admin" }, { cedula: null, fullName: "Docente Nueva", email: "nueva@x.co", role: "teacher" }, "http://localhost:3000")).ok, false);
  assert.equal((await createStaffAccount(db, { role: "student" }, { cedula: null, fullName: "X", email: "x@x.co", role: "teacher" }, "http://localhost:3000")).ok, false);
});

// ---- docentes adicionales y suplentes que no aprueban

test("una docente adicional ve la asignatura, programa horarios y marca resultados; una suplente sin permiso de aprobar no puede calificar", async () => {
  const { db, admin, t1, t2, stu } = await classesSetup();
  const made = await createClass(db, t1, { title: "Meditaciones", modality: "virtual", description: "" });
  const classId = made.ok ? made.id : "";
  await db.run("INSERT INTO class_teachers (class_id, user_id) VALUES (?, ?)", [classId, t2.id]);
  await placeClass(db, admin, (await getPensum(db, HATHA))[0].id, classId);
  await enroll(db, stu.id, HATHA);
  assert.equal((await byTitle(db, "Meditaciones")).teacher_name, "Docente Uno y Docente Dos");
  assert.deepEqual((await getTeacherClasses(db, t2.id)).map((c) => c.title), ["Meditaciones"]);
  await cycle(db, t2);
  assert.deepEqual(await addClassSessions(db, t2, { classId, title: "", ...FUTURE, weeks: 1, location: null, onlineUrl: null }), { ok: true, created: 1 });
  assert.equal((await getTeacherSessionsBetween(db, t2.id, "2099-01-01T00:00:00.000Z", "2100-01-01T00:00:00.000Z")).length, 1);
  assert.deepEqual(await setClassProgress(db, t2, classId, stu.id, "aprobado"), { ok: true });

  assert.deepEqual(await setCanGrade(db, admin, t2.id, false), { ok: true });
  assert.equal((await setCanGrade(db, t1, t2.id, true)).ok, false, "solo la administración");
  const blocked = await setClassProgress(db, t2, classId, stu.id, "no_aprobado");
  assert.equal(blocked.ok, false);
  assert.match(blocked.ok ? "" : blocked.error, /suplente/i);
  assert.deepEqual(await setClassProgress(db, t1, classId, stu.id, "automatico"), { ok: true }, "la titular sí puede");
  assert.equal((await deleteClass(db, t2, classId)).ok, false, "solo la titular borra");
});

// ---- avance

test("el avance es automático (pendiente antes del ciclo, en curso después) y solo la docente de la clase marca aprobada o no", async () => {
  const { db, admin, t1, t2, stu } = await classesSetup();
  const stu2 = await createUser(db, { cedula: "6", fullName: "Otra", email: "s6@x.co", role: "student", password: "Correcta123" });
  const mk = async (title: string) => {
    const r = await createClass(db, t1, { title, modality: "virtual", description: "" });
    return r.ok ? r.id : "";
  };
  const [futura, empezada, tercera] = [await mk("Futura"), await mk("Empezada"), await mk("Tercera")];
  const mod = (await getPensum(db, HATHA))[0].id;
  for (const id of [futura, empezada, tercera]) await placeClass(db, admin, mod, id);
  await cycle(db, t1);
  await addClassSessions(db, t1, { classId: futura, title: "", ...FUTURE, weeks: 1, location: null, onlineUrl: null });
  await addClassSessions(db, t1, { classId: empezada, title: "", startsAt: "2020-01-07T23:00:00.000Z", endsAt: "2020-01-08T01:00:00.000Z", weeks: 1, location: null, onlineUrl: null });
  await enroll(db, stu.id, HATHA);

  const status = async (title: string, userId = stu.id) => (await getStudentProgress(db, userId, HATHA)).modules.flatMap((m) => m.classes).find((c) => c.title === title)!;
  assert.equal((await status("Futura")).status, "pendiente");
  assert.equal((await status("Empezada")).status, "en_curso");
  assert.equal((await status("Tercera")).status, "pendiente");
  assert.ok((await status("Futura")).cycle_start);

  assert.equal((await setClassProgress(db, t2, empezada, stu.id, "aprobado")).ok, false, "otra docente no puede");
  assert.equal((await setClassProgress(db, admin, empezada, stu.id, "aprobado")).ok, false, "ni la administración");
  assert.equal((await setClassProgress(db, stu, empezada, stu.id, "aprobado")).ok, false, "ni la estudiante");
  assert.equal((await setClassProgress(db, t1, empezada, stu2.id, "aprobado")).ok, false, "no inscrita");
  assert.equal((await setClassProgress(db, t1, empezada, stu.id, "excelente")).ok, false);
  assert.deepEqual(await setClassProgress(db, t1, empezada, stu.id, "aprobado"), { ok: true });
  assert.deepEqual(await setClassProgress(db, t1, futura, stu.id, "no_aprobado"), { ok: true });
  assert.equal((await status("Empezada")).status, "aprobado");
  assert.equal((await status("Futura")).status, "no_aprobado");

  const p = await getStudentProgress(db, stu.id, HATHA);
  assert.equal(p.approved, 1);
  assert.equal(p.notApproved, 1);
  assert.equal(p.allApproved, false);
  assert.equal(p.total, p.approved + p.inCourse + p.pending + p.notApproved);
  const roster = await getClassStudentsProgress(db, empezada);
  assert.deepEqual(roster.map((r) => [r.full_name, r.status, r.decided]), [["Estudiante", "aprobado", true]]);
  await setClassProgress(db, t1, empezada, stu.id, "automatico");
  assert.equal((await status("Empezada")).status, "en_curso");
  void getClassStudents;
});

// ---- suplencias

async function coverSetup() {
  const s = await classesSetup();
  const made = await createClass(s.db, s.t1, { title: "Marketing", modality: "virtual", description: "" });
  const classId = made.ok ? made.id : "";
  await placeClass(s.db, s.admin, (await getPensum(s.db, HATHA))[0].id, classId);
  await cycle(s.db, s.t1);
  await addClassSessions(s.db, s.t1, { classId, title: "", ...FUTURE, weeks: 2, location: null, onlineUrl: null });
  await enroll(s.db, s.stu.id, HATHA);
  return { ...s, classId };
}

test("suplencia: al aceptarla la clase cambia de docente, las estudiantes no reciben aviso y la nueva docente puede mover horarios", async () => {
  const { db, t1, t2, stu, classId } = await coverSetup();
  assert.equal((await requestCover(db, t2, classId, t1.id, "")).ok, false, "solo la docente de la clase la puede pedir");
  assert.equal((await requestCover(db, t1, classId, t1.id, "")).ok, false, "no a sí misma");
  assert.equal((await requestCover(db, t1, classId, stu.id, "")).ok, false, "no a una estudiante");
  assert.deepEqual(await requestCover(db, t1, classId, t2.id, "Voy a viajar esas semanas"), { ok: true });
  assert.equal((await requestCover(db, t1, classId, t2.id, "")).ok, false, "una sola solicitud pendiente por clase");

  const inbox = await incomingCoverRequests(db, t2.id);
  assert.equal(inbox.length, 1);
  assert.equal(await notifCount(db, t2.id), 1);

  const studentBefore = await notifCount(db, stu.id);
  assert.equal((await respondCover(db, t1, inbox[0].id, true)).ok, false);
  assert.deepEqual(await respondCover(db, t2, inbox[0].id, true), { ok: true });
  assert.equal((await byTitle(db, "Marketing")).teacher_name, "Docente Dos");
  assert.equal(await notifCount(db, stu.id), studentBefore, "las estudiantes NO reciben aviso del cambio de docente");
  assert.equal(await notifCount(db, t1.id), 1);
  assert.equal((await respondCover(db, t2, inbox[0].id, true)).ok, false);

  // sus horarios no desaparecen cuando la docente anterior abre otro ciclo
  await cycle(db, t1, new Date("2099-08-10T15:00:00Z"));
  const [first] = await getStudentSessions(db, stu.id);
  assert.ok(first, "los horarios pasaron al ciclo de la nueva docente (o quedaron sueltos)");
  assert.equal((await rescheduleSession(db, t1, { sessionId: first.id, startsAt: FUTURE.startsAt, endsAt: FUTURE.endsAt, location: null, onlineUrl: null, status: "cancelled", reason: "Ya no es mía" })).ok, false);
  const moved = await rescheduleSession(db, t2, { sessionId: first.id, startsAt: "2099-04-01T23:00:00.000Z", endsAt: "2099-04-02T01:00:00.000Z", location: null, onlineUrl: null, status: "scheduled", reason: "Nuevo horario" });
  assert.deepEqual(moved, { ok: true, notified: 1 });
  assert.equal(await notifCount(db, stu.id), studentBefore + 1, "el cambio de horario sí se avisa");
});

test("suplencia: una suplente sin permiso de aprobar queda como docente adicional y la titular conserva la nota", async () => {
  const { db, admin, t1, t2, stu, classId } = await coverSetup();
  await setCanGrade(db, admin, t2.id, false);
  await requestCover(db, t1, classId, t2.id, "");
  const [req] = await incomingCoverRequests(db, t2.id);
  assert.deepEqual(await respondCover(db, t2, req.id, true), { ok: true });
  const c = await byTitle(db, "Marketing");
  assert.equal(c.teacher_id, t1.id, "la titular sigue siendo la misma");
  assert.equal(c.teacher_name, "Docente Uno y Docente Dos");
  assert.equal((await setClassProgress(db, t2, classId, stu.id, "aprobado")).ok, false);
  assert.deepEqual(await setClassProgress(db, t1, classId, stu.id, "aprobado"), { ok: true });
  assert.equal((await rescheduleSession(db, t2, { sessionId: (await getTeacherSessionsBetween(db, t2.id, "2099-01-01T00:00:00.000Z", "2100-01-01T00:00:00.000Z"))[0].id, startsAt: "2099-04-01T23:00:00.000Z", endsAt: "2099-04-02T01:00:00.000Z", location: null, onlineUrl: null, status: "scheduled", reason: "Cambio de la suplente" })).ok, true, "la suplente sí cambia horarios");
});

test("suplencia: rechazar o cancelar deja la clase como estaba; no se pide a docentes sin registro completo", async () => {
  const { db, t1, t2, classId } = await coverSetup();
  await requestCover(db, t1, classId, t2.id, "");
  const [req] = await incomingCoverRequests(db, t2.id);
  assert.deepEqual(await respondCover(db, t2, req.id, false), { ok: true });
  assert.equal((await byTitle(db, "Marketing")).teacher_id, t1.id);
  assert.equal(await notifCount(db, t1.id), 1);

  await requestCover(db, t1, classId, t2.id, "");
  const [again] = await incomingCoverRequests(db, t2.id);
  assert.equal((await cancelCover(db, t2, again.id)).ok, false, "solo quien la envió la cancela");
  assert.deepEqual(await cancelCover(db, t1, again.id), { ok: true });
  assert.equal((await incomingCoverRequests(db, t2.id)).length, 0);

  await createStaffAccount(db, { role: "admin" }, { cedula: null, fullName: "Laura Pendiente", email: "laura@x.co", role: "teacher" }, "http://localhost:3000");
  const names = (await listCoverCandidates(db, t1.id)).map((c) => c.full_name);
  assert.ok(names.includes("Docente Dos") && !names.includes("Laura Pendiente") && !names.includes("Docente Uno"));
});

test("suplencia: si la clase cambió de docente mientras tanto, la solicitud se cancela al aceptar", async () => {
  const { db, admin, t1, t2, classId } = await coverSetup();
  await requestCover(db, t1, classId, t2.id, "");
  const [req] = await incomingCoverRequests(db, t2.id);
  await updateClass(db, admin, classId, { title: "Marketing", modality: "virtual", description: "", teacherId: admin.id });
  assert.equal((await respondCover(db, t2, req.id, true)).ok, false);
  assert.equal((await byTitle(db, "Marketing")).teacher_id, admin.id);
});

void addModule;

// ---------------------------------------------------------------- aceptación del contrato y las políticas, con evidencia

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { POLITICAS } from "../data/politicas.ts";
import { expectedDocumentKeys, expectedKeysFor, linkAcceptanceToUser, missingDocuments, recordAcceptance, startsWithinRetractWindow } from "./acceptance.ts";

/** Carpeta public falsa con un PDF por documento, para probar cambios de versión sin tocar los reales. */
function fakePublic(version: string): string {
  const dir = mkdtempSync(join(tmpdir(), "fc-pub-"));
  mkdirSync(join(dir, "politicas"));
  for (const p of POLITICAS) writeFileSync(join(dir, p.href), `${p.key}:${version}`);
  return dir;
}

const consents = { data: true, health: true, image: false, marketing: false, early_start: false };
const who = (u: { id: string; cedula: string; email: string; full_name: string }) => ({ userId: u.id, cedula: u.cedula, email: u.email, fullName: u.full_name });

test("los documentos que aplican dependen de lo que la persona compra", () => {
  assert.deepEqual(expectedDocumentKeys(["certificacion"]), ["contrato", "general", "profesorados", "asistencia"]);
  assert.deepEqual(expectedDocumentKeys(["certificacion", "taller", "taller"]), ["contrato", "general", "profesorados", "talleres", "asistencia"]);
  assert.deepEqual(expectedDocumentKeys(["retiro"]), ["contrato", "general", "retiros", "asistencia"]);
});

test("aceptar guarda la evidencia y deja al día a la estudiante; si un PDF cambia, vuelve a faltar solo ese", async () => {
  const { db, stu, t1 } = await classesSetup();
  await enroll(db, stu.id, HATHA);
  const dir = fakePublic("v1");
  assert.deepEqual(await missingDocuments(db, stu, dir), ["contrato", "general", "profesorados", "asistencia"]);
  assert.deepEqual(await missingDocuments(db, t1, dir), [], "las docentes no firman el contrato de estudiantes");

  const keys = await expectedKeysFor(db, stu);
  const id = await recordAcceptance(db, { ...who({ ...stu, full_name: "Estudiante" }), orderId: null, context: "campus", keys, consents, ip: "1.2.3.4", userAgent: "Prueba/1.0", publicDir: dir });
  assert.deepEqual(await missingDocuments(db, stu, dir), []);
  const row = await db.get<{ ip: string; consents: string }>("SELECT ip, consents FROM acceptances WHERE id = ?", [id]);
  assert.equal(row?.ip, "1.2.3.4");
  assert.equal(JSON.parse(row!.consents).health, true);
  const docs = await db.all<{ sha256: string }>("SELECT sha256 FROM acceptance_documents WHERE acceptance_id = ?", [id]);
  assert.equal(docs.length, 4);
  assert.ok(docs.every((d) => /^[0-9a-f]{64}$/.test(d.sha256)));

  writeFileSync(join(dir, "politicas/politica-general-de-matricula-cancelacion-y-reembolso.pdf"), "general:v2");
  assert.deepEqual(await missingDocuments(db, stu, dir), ["general"], "cambió un documento: debe aceptarlo de nuevo");
});

test("la aceptación hecha por cédula en el checkout cuenta cuando se crea la cuenta", async () => {
  const { db } = await classesSetup();
  const dir = fakePublic("v1");
  const order = await createOrder(db, { cedula: buyer.cedula, name: buyer.name, email: buyer.email, phone: null }, [SLUG], null, "demo");
  assert.ok(order.ok);
  const orderId = order.ok ? order.orderId : "";
  await recordAcceptance(db, { userId: null, cedula: buyer.cedula, email: buyer.email, fullName: buyer.name, orderId, context: "checkout", keys: expectedDocumentKeys(["certificacion"]), consents, ip: "9.9.9.9", userAgent: "x", publicDir: dir });
  await completeOrder(db, orderId, "ref", "http://localhost:3000");
  const user = (await findUserByCedula(db, buyer.cedula))!;
  const link = await db.get<{ user_id: string | null }>("SELECT user_id FROM acceptances WHERE order_id = ?", [orderId]);
  assert.equal(link?.user_id, user.id, "quedó ligada a la cuenta");
  assert.deepEqual(await missingDocuments(db, user, dir), [], "no vuelve a pedirle lo que ya aceptó al pagar");
  const mail = await lastEmail(db, buyer.email);
  assert.match(mail!.body_text, /Documentos que aceptaste/);
  assert.match(mail!.body_text, /politica-general-de-matricula-cancelacion-y-reembolso\.pdf/);
  void linkAcceptanceToUser;
});

test("si el programa empieza dentro de 5 días hábiles se pide el consentimiento de inicio anticipado", async () => {
  const db = await setup(); // grupo de Hatha que empieza en 2099
  assert.equal(await startsWithinRetractWindow(db, [SLUG]), false);
  const soon = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  await db.run("INSERT INTO cohorts (id, program_slug, name, sede, starts_on, active, created_at) VALUES (?, ?, 'Pronto', 'Online', ?, 1, ?)", [newId(), SLUG, soon, nowIso()]);
  assert.equal(await startsWithinRetractWindow(db, [SLUG]), true);
  assert.equal(await startsWithinRetractWindow(db, ["certificacion-de-yoga-kids"]), false);
});

