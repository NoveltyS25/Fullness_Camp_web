/**
 * Pone el «Marketing digital» de Paula Salazar (6 clases) en una base de datos que ya tenía el pensum de Hatha sembrado.
 * Si Paula ya había creado una clase de prueba llamada «Marketing Digital», la convierte (conserva sus horarios);
 * si no, crea una. Quita la clase de demostración «Marketing para instructoras». En una base nueva no hace falta.
 *
 *   node scripts/aplicar-marketing.ts
 *
 * Es seguro repetirlo.
 */
import { MARKETING_DIGITAL } from "../src/data/pensum-seed.ts";
import { claimSuggestedClasses, ensureSeed } from "../src/server/classes.ts";
import { getDb, newId, nowIso } from "../src/server/db/index.ts";

const db = getDb();
const HATHA = "hatha-vinyasa-yoga-y-meditacion";
await ensureSeed(db, HATHA);
const email = MARKETING_DIGITAL.teacherEmail!.toLowerCase();
const teacher = await db.get<{ id: string }>("SELECT id FROM users WHERE email = ? AND role IN ('teacher', 'admin') ORDER BY created_at LIMIT 1", [email]);

// 1) la clase de demostración ya no hace falta
const demo = await db.run("DELETE FROM classes WHERE title = 'Marketing para instructoras'");
if (demo.changes) console.log("Quitada la clase de demostración «Marketing para instructoras».");

// 2) la clase real
let cls = await db.get<{ id: string }>("SELECT id FROM classes WHERE title = ? COLLATE NOCASE", [MARKETING_DIGITAL.title]);
if (!cls && teacher) {
  cls = await db.get<{ id: string }>("SELECT id FROM classes WHERE teacher_id = ? AND title = 'Marketing Digital' COLLATE NOCASE", [teacher.id]);
  if (cls) console.log("Se conservó la clase «Marketing Digital» que Paula ya había creado, con sus horarios.");
}
if (!cls) {
  const id = newId();
  await db.run("INSERT INTO classes (id, title, teacher_id, modality, created_at) VALUES (?, ?, NULL, 'virtual', ?)", [id, MARKETING_DIGITAL.title, nowIso()]);
  cls = { id };
  console.log("Creada la clase «Marketing digital».");
}
await db.run("UPDATE classes SET title = ?, suggested_teacher_email = ? WHERE id = ?", [MARKETING_DIGITAL.title, email, cls.id]);

// 3) su temario de 6 clases
const has = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM class_lessons WHERE class_id = ?", [cls.id]);
if (Number(has?.n ?? 0) === 0) {
  for (const [i, l] of MARKETING_DIGITAL.lessons!.entries()) {
    await db.run("INSERT INTO class_lessons (id, class_id, position, title, topics, created_at) VALUES (?, ?, ?, ?, ?, ?)", [newId(), cls.id, i + 1, l.title, l.topics.join("\n"), nowIso()]);
  }
  console.log("Temario agregado: 6 clases.");
}

// 4) en Hatha, en el módulo «El yoga como camino de vida»
const placed = await db.get(
  "SELECT 1 AS ok FROM module_classes mc JOIN curriculum_modules m ON m.id = mc.module_id WHERE mc.class_id = ? AND m.program_slug = ?",
  [cls.id, HATHA],
);
if (!placed) {
  const mod = await db.get<{ id: string }>("SELECT id FROM curriculum_modules WHERE program_slug = ? AND title = 'El yoga como camino de vida'", [HATHA]);
  if (mod) {
    const last = await db.get<{ p: number | null }>("SELECT MAX(position) AS p FROM module_classes WHERE module_id = ?", [mod.id]);
    await db.run("INSERT INTO module_classes (id, module_id, class_id, position) VALUES (?, ?, ?, ?)", [newId(), mod.id, cls.id, Number(last?.p ?? 0) + 1]);
    console.log("Colocada en Hatha 300 h, módulo «El yoga como camino de vida».");
  }
}

if (teacher) {
  await claimSuggestedClasses(db, teacher.id, email);
  console.log("Asignada a la docente con cuenta:", email);
} else {
  console.log(`Aún no hay cuenta para ${email}: la clase se le asignará sola cuando se cree.`);
}
