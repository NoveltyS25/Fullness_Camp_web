/**
 * Arma los 5 certificados con la organización de octubre de 2026 (src/data/pensum-seed.ts) en una base de datos que ya tenía otro pensum.
 *
 *   node scripts/aplicar-organizacion.ts
 *
 * Qué hace, en una sola transacción:
 *  1. borra los módulos de esos 5 certificados y las asignaturas que estaban colocadas en ellos y no vienen de la organización nueva
 *     (con sus horarios y avances);
 *  2. siembra «Módulo 1», «Módulo 2»… con las asignaturas compartidas, a nombre de cada docente que ya tenga cuenta.
 * En una base nueva no hace falta: el pensum se siembra solo la primera vez que se pide.
 */
import { CERTIFICACIONES } from "../src/data/pensum-seed.ts";
import { ensureSeed } from "../src/server/classes.ts";
import { getDb } from "../src/server/db/index.ts";

const db = getDb();
const slugs = Object.keys(CERTIFICACIONES);
const marks = slugs.map(() => "?").join(", ");

const old = await db.all<{ id: string }>(
  `SELECT DISTINCT c.id FROM classes c JOIN module_classes mc ON mc.class_id = c.id JOIN curriculum_modules m ON m.id = mc.module_id
   WHERE m.program_slug IN (${marks}) AND c.seed_key IS NULL`,
  slugs,
);
await db.transaction(async (tx) => {
  for (const c of old) await tx.run("DELETE FROM classes WHERE id = ?", [c.id]);
  await tx.run(`DELETE FROM curriculum_modules WHERE program_slug IN (${marks})`, slugs);
  await tx.run(`DELETE FROM curriculum_seeded WHERE program_slug IN (${marks})`, slugs);
});
console.log(`Se quitaron ${old.length} asignaturas del pensum anterior.`);

for (const slug of slugs) await ensureSeed(db, slug);

const rows = await db.all<{ program_slug: string; modules: number; classes: number }>(
  `SELECT m.program_slug, COUNT(DISTINCT m.id) AS modules, COUNT(mc.id) AS classes
   FROM curriculum_modules m LEFT JOIN module_classes mc ON mc.module_id = m.id WHERE m.program_slug IN (${marks}) GROUP BY m.program_slug`,
  slugs,
);
for (const r of rows) console.log(`${r.program_slug}: ${r.modules} módulos, ${r.classes} asignaturas`);

const sinDocente = await db.all<{ title: string; suggested_teacher_email: string }>("SELECT title, suggested_teacher_email FROM classes WHERE seed_key IS NOT NULL AND teacher_id IS NULL ORDER BY title");
if (sinDocente.length) {
  console.log("Asignaturas esperando la cuenta de su docente (se asignan solas al crearla):");
  for (const c of sinDocente) console.log(`  · ${c.title} → ${c.suggested_teacher_email}`);
}
