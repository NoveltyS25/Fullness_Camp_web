/**
 * Deja la base de datos local lista para la demostración: cohortes con clases semanales para los programas
 * que se pueden comprar, una profesora, una administradora y una estudiante ya inscrita.
 *
 *   npm run db:seed    agrega lo que falte (no borra nada)
 *   npm run db:reset   borra la base de datos local y la deja como nueva
 *
 * Las contraseñas se generan al azar, se muestran al terminar y se guardan en data/demo-credenciales.txt
 * (esa carpeta no se sube a GitHub).
 */
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { createCohort } from "../src/server/campus.ts";
import { addClassSessions, createClass, getPensum, placeClass } from "../src/server/classes.ts";
import { getDb } from "../src/server/db/index.ts";
import { generateTempPassword } from "../src/server/security.ts";
import { createUser, findUserByCedula } from "../src/server/users.ts";

const dbPath = process.env.FULLNESS_DB_PATH ?? "data/fullness.sqlite";
if (process.argv.includes("--reset")) {
  for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) if (existsSync(f)) rmSync(f);
  console.log("Base de datos local reiniciada.");
}

const db = getDb();
const creds: string[] = [];

async function ensureUser(cedula: string, fullName: string, email: string, role: "admin" | "teacher" | "student", mustChange: boolean) {
  const existing = await findUserByCedula(db, cedula);
  if (existing) return existing;
  const password = generateTempPassword(12);
  const user = await createUser(db, { cedula, fullName, email, role, password, mustChange });
  creds.push(`${role.padEnd(8)} cédula ${cedula}   contraseña ${password}${mustChange ? "   (pedirá cambiarla)" : ""}   ${fullName}`);
  return user;
}

const admin = await ensureUser("1000000001", "Administradora Demo", "admin.demo@example.com", "admin", false);

const teacher = await ensureUser("1000000002", "Profesora Demo", "profesora.demo@example.com", "teacher", false);
const student = await ensureUser("1000000003", "Estudiante Demo", "estudiante.demo@example.com", "student", false);

// Próximo martes a las 6:00 p. m. de Colombia (23:00 UTC), y los siguientes semanalmente.
function nextWeekday(dayOfWeek: number, hourUtc: number): Date {
  const d = new Date();
  d.setUTCHours(hourUtc, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + ((dayOfWeek + 7 - d.getUTCDay()) % 7 || 7));
  return d;
}

const cohorts = [
  { slug: "hatha-vinyasa-yoga-y-meditacion", name: "Hatha Vinyasa 300h · Grupo A", sede: "Bogotá" },
  { slug: "certificacion-de-yoga-y-pilates", name: "Yoga y Pilates 250h · Grupo A", sede: "Cajicá" },
  { slug: "certificacion-de-yoga-kids", name: "Yoga Kids 200h · Grupo A", sede: "Online" },
  { slug: "yoga-prenatal-nacimiento-consciente", name: "Taller gestacional · Grupo A", sede: "Tabío" },
] as const;

const existing = new Set((await db.all<{ name: string }>("SELECT name FROM cohorts")).map((c) => c.name));
for (const c of cohorts) {
  if (existing.has(c.name)) continue;
  await createCohort(db, { programSlug: c.slug, name: c.name, sede: c.sede, teacherId: null, startsOn: nextWeekday(2, 23).toISOString().slice(0, 10) });
}

// Clases de demostración: la docente demo dicta algunas del pensum de Hatha y una clase propia que está en dos certificaciones.
const hasClasses = await db.get("SELECT 1 AS ok FROM sessions LIMIT 1");
if (!hasClasses) {
  const hatha = await getPensum(db, "hatha-vinyasa-yoga-y-meditacion");
  // Las clases con temario y docente prevista (como Anatomía, de Alexa) no se asignan a la docente demo.
  const first3 = hatha.flatMap((m) => m.classes).filter((c) => c.lessons.length === 0).slice(0, 3);
  const days = [2, 4, 3];
  for (const [i, c] of first3.entries()) {
    await db.run("UPDATE classes SET teacher_id = ? WHERE id = ?", [teacher.id, c.class_id]);
    const start = nextWeekday(days[i], 23);
    await addClassSessions(db, teacher, { classId: c.class_id, title: "", startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 2 * 3600_000).toISOString(), weeks: 8, location: i === 0 ? "Sede Bogotá, calle 127" : null, onlineUrl: i === 0 ? null : "https://meet.example.com/demo" });
  }

  // «Marketing»: una sola clase en dos certificaciones (como la de Paula).
  const made = await createClass(db, teacher, { title: "Marketing para instructoras", modality: "virtual", description: "Cómo darte a conocer y construir tu proyecto de yoga." });
  if (made.ok) {
    const start = nextWeekday(5, 23);
    await addClassSessions(db, teacher, { classId: made.id, title: "", startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 2 * 3600_000).toISOString(), weeks: 6, location: null, onlineUrl: "https://meet.example.com/marketing" });
    for (const slug of ["hatha-vinyasa-yoga-y-meditacion", "certificacion-de-yoga-y-pilates"]) {
      let modules = await getPensum(db, slug);
      if (modules.length === 0) {
        await db.run("INSERT INTO curriculum_modules (id, program_slug, position, title, created_at) VALUES (?, ?, 1, ?, ?)", [crypto.randomUUID(), slug, "Módulo 1", new Date().toISOString()]);
        modules = await getPensum(db, slug);
      }
      await placeClass(db, { id: admin.id, role: "admin" }, modules[modules.length - 1].id, made.id);
    }
  }
}

// La estudiante demo ya está inscrita en el primer grupo (como si hubiera pagado antes).
const enrolled = await db.get("SELECT 1 AS ok FROM enrollments WHERE user_id = ?", [student.id]);
if (!enrolled) {
  const cohort = await db.get<{ id: string; program_slug: string }>("SELECT id, program_slug FROM cohorts ORDER BY created_at LIMIT 1");
  if (cohort) {
    await db.run("INSERT INTO enrollments (id, user_id, program_slug, cohort_id, order_id, status, created_at) VALUES (?, ?, ?, ?, NULL, 'active', ?)", [
      crypto.randomUUID(), student.id, cohort.program_slug, cohort.id, new Date().toISOString(),
    ]);
  }
}

console.log("\nBase de datos de demostración lista.");
if (creds.length) {
  const text = creds.join("\n");
  console.log("\nCuentas creadas (guárdalas, no se vuelven a mostrar):\n" + text);
  const credsFile = process.env.SEED_CREDS_FILE ?? "data/demo-credenciales.txt";
  writeFileSync(credsFile, text + "\n", { flag: "a" });
  console.log(`\nTambién quedaron en ${credsFile}`);
} else {
  console.log("Las cuentas de demostración ya existían (sus contraseñas están en data/demo-credenciales.txt).");
}
