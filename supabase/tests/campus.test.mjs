import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();
const migration = readFileSync(new URL("../migrations/0001_campus.sql", import.meta.url), "utf8")
  .replace(/create extension if not exists "pgcrypto";/, ""); // gen_random_uuid ya es nativo

// Simula lo que Supabase ya trae: roles, esquema auth y permisos por defecto.
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`);
await db.exec(migration);
console.log("migración aplicada sin errores");

const ids = {};
for (const [k, email] of Object.entries({ admin: "admin@x.co", teacher: "t@x.co", teacher2: "t2@x.co", s1: "s1@x.co", s2: "s2@x.co", s3: "s3@x.co" })) {
  const r = await db.query("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [email, JSON.stringify({ full_name: k })]);
  ids[k] = r.rows[0].id;
}
await db.exec(`
  update profiles set role='admin' where email='admin@x.co';
  update profiles set role='teacher' where email in ('t@x.co','t2@x.co');
  update profiles set whatsapp_phone='573116741900', notify_whatsapp=true where email='s1@x.co';
`);
const cohortA = (await db.query("insert into cohorts (program_slug,name,sede,teacher_id) values ('p','A','Bogotá',$1) returning id", [ids.teacher])).rows[0].id;
const cohortB = (await db.query("insert into cohorts (program_slug,name,sede,teacher_id) values ('p','B','Tabío',$1) returning id", [ids.teacher2])).rows[0].id;
await db.query("insert into enrollments (cohort_id, student_id) values ($1,$2),($1,$3),($4,$5)", [cohortA, ids.s1, ids.s2, cohortB, ids.s3]);
const sA = (await db.query("insert into sessions (cohort_id,title,starts_at,ends_at) values ($1,'Clase A','2030-10-05T23:00Z','2030-10-06T01:00Z') returning id", [cohortA])).rows[0].id;
const sB = (await db.query("insert into sessions (cohort_id,title,starts_at,ends_at) values ($1,'Clase B','2030-10-05T23:00Z','2030-10-06T01:00Z') returning id", [cohortB])).rows[0].id;

async function as(user, fn) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ? ids[user] : ""]);
  await db.exec(`set role ${user ? "authenticated" : "anon"}`);
  try { return await fn(); } finally { await db.exec("reset role"); }
}
const q = (sql, p) => db.query(sql, p).then((r) => r.rows);
const fails = async (fn, msg) => { try { await fn(); } catch (e) { return e.message; } assert.fail("debía fallar: " + msg); };
let n = 0; const ok = (m) => console.log(`  ✔ ${++n}. ${m}`);

// ---- lectura
assert.equal((await as("s1", () => q("select * from sessions"))).length, 1); ok("S1 ve solo la sesión de su cohorte");
assert.equal((await as("s3", () => q("select * from sessions"))).length, 1); ok("S3 ve solo la suya (cohorte B)");
assert.equal((await as("s1", () => q("select * from profiles"))).length, 1); ok("S1 solo ve su propio perfil");
assert.equal((await as("teacher", () => q("select * from sessions"))).length, 1); ok("Profesora A ve solo su sesión");
assert.equal((await as("admin", () => q("select * from sessions"))).length, 2); ok("Admin ve todo");
await as(null, () => fails(() => q("select * from sessions"), "anon lee")); ok("Sin sesión iniciada: permiso denegado");
await as(null, () => fails(() => q("select * from profiles"), "anon lee perfiles")); ok("Sin sesión iniciada no ve perfiles");

// ---- escritura prohibida
await as("s1", () => fails(() => q("update profiles set role='admin' where id=$1", [ids.s1]), "subir de rol")); ok("S1 NO puede volverse admin");
await as("s1", async () => { await q("update profiles set full_name='Ana' where id=$1", [ids.s1]); }); ok("S1 sí edita su nombre");
const other = await as("s1", () => q("update profiles set full_name='X' where id=$1 returning id", [ids.s2])); assert.equal(other.length, 0); ok("S1 NO edita el perfil de S2");
const s1edit = await as("s1", () => q("update sessions set title='hack' returning id")); assert.equal(s1edit.length, 0);
assert.equal((await q("select count(*)::int c from sessions where title='hack'"))[0].c, 0); ok("S1 NO edita sesiones (0 filas modificadas)");
const direct = await as("teacher", () => q("update sessions set title='hack' where id=$1 returning id", [sA])); assert.equal(direct.length, 0); ok("Profesora NO edita sesiones directo (solo por la función)");
await as("s1", () => fails(() => q("select * from notification_deliveries"), "ver cola")); ok("S1 NO ve la cola de envíos");
await as("teacher", () => fails(() => q("select * from notification_deliveries"), "ver cola")); ok("Profesora NO ve la cola de envíos");

// ---- cambio de horario
await as("s1", () => fails(() => q("select reschedule_session($1,$2,$3,null,null,'scheduled','x motivo')", [sA, "2030-10-07T23:00Z", "2030-10-08T01:00Z"]), "estudiante cambia")); ok("Estudiante NO puede cambiar horarios");
await as("teacher2", () => fails(() => q("select reschedule_session($1,$2,$3,null,null,'scheduled','x motivo')", [sA, "2030-10-07T23:00Z", "2030-10-08T01:00Z"]), "otra profesora")); ok("Otra profesora NO puede cambiar la sesión de A");
await as("teacher", () => fails(() => q("select reschedule_session($1,$2,$3,null,null,'scheduled','')", [sA, "2030-10-07T23:00Z", "2030-10-08T01:00Z"]), "sin motivo")); ok("Sin motivo se rechaza");
await as("teacher", () => fails(() => q("select reschedule_session($1,$2,$3,null,null,'scheduled','motivo')", [sA, "2030-10-08T01:00Z", "2030-10-07T23:00Z"]), "fin antes de inicio")); ok("Fin antes del inicio se rechaza");

const notified = await as("teacher", () => q("select reschedule_session($1,$2,$3,'Sede Bogotá',null,'scheduled','Cruce con otra actividad') as n", [sA, "2030-10-07T23:00Z", "2030-10-08T01:00Z"]));
assert.equal(notified[0].n, 2); ok("Profesora A cambia la clase y se notifica a 2 estudiantes");

const upd = await q("select starts_at, location from sessions where id=$1", [sA]);
assert.equal(new Date(upd[0].starts_at).toISOString(), "2030-10-07T23:00:00.000Z"); assert.equal(upd[0].location, "Sede Bogotá"); ok("La sesión quedó actualizada");
const chg = await q("select old_data, new_data, reason, changed_by from session_changes"); assert.equal(chg.length, 1); assert.equal(chg[0].changed_by, ids.teacher); assert.equal(chg[0].reason, "Cruce con otra actividad"); ok("Quedó el historial con quién, antes/después y motivo");
const del = await q("select n.user_id, d.channel from notification_deliveries d join notifications n on n.id=d.notification_id order by 1,2");
const byUser = (u) => del.filter((d) => d.user_id === ids[u]).map((d) => d.channel).sort().join("+");
assert.equal(byUser("s1"), "email+whatsapp"); assert.equal(byUser("s2"), "email"); assert.equal(byUser("s3"), ""); ok("Cola: S1 correo+WhatsApp, S2 solo correo, S3 (otra cohorte) nada");
assert.equal((await as("s1", () => q("select * from notifications"))).length, 1); ok("S1 ve solo su aviso en la plataforma");
assert.equal((await as("s3", () => q("select * from notifications"))).length, 0); ok("S3 no recibe avisos ajenos");
const body = (await as("s1", () => q("select body from notifications")))[0].body; assert.match(body, /07\/10\/2030 de 18:00 a 20:00 \(hora de Colombia\)/); ok("El aviso muestra la hora de Colombia: " + body.slice(0, 70) + "…");

const again = await as("teacher", () => q("select reschedule_session($1,$2,$3,'Sede Bogotá',null,'scheduled','otro motivo') as n", [sA, "2030-10-07T23:00Z", "2030-10-08T01:00Z"]));
assert.equal(again[0].n, 0); ok("Repetir el mismo cambio no vuelve a avisar a nadie");

const cancel = await as("teacher", () => q("select reschedule_session($1,$2,$3,'Sede Bogotá',null,'cancelled','Enfermedad') as n", [sA, "2030-10-07T23:00Z", "2030-10-08T01:00Z"]));
assert.equal(cancel[0].n, 2);
assert.match((await as("s2", () => q("select title from notifications order by created_at desc limit 1")))[0].title, /cancelada/i); ok("Cancelar avisa como 'Clase cancelada'");

await as("s1", async () => { await q("update notifications set read_at=now()"); }); ok("S1 marca sus avisos como leídos");
await as("s1", () => fails(() => q("update notifications set title='hack'"), "editar aviso")); ok("S1 NO puede editar el texto de un aviso");

await db.exec("update enrollments set status='paused' where student_id='" + ids.s2 + "'");
const after = await as("teacher", () => q("select reschedule_session($1,$2,$3,'Otro lugar',null,'scheduled','Cambio de salón') as n", [sA, "2030-10-07T23:00Z", "2030-10-08T01:00Z"]));
assert.equal(after[0].n, 1); ok("Una inscripción pausada no recibe avisos");

const admin = await as("admin", () => q("select reschedule_session($1,$2,$3,null,null,'scheduled','Ajuste de admin') as n", [sB, "2030-10-09T23:00Z", "2030-10-10T01:00Z"]));
assert.equal(admin[0].n, 1); ok("Admin puede cambiar cualquier sesión");

console.log(`\nTodas las pruebas de base de datos pasaron (${n}).`);
