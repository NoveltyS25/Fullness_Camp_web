/**
 * Pone la asignatura «Fundamentos del yoga» (Lila Govardhan, 8 clases) en una base de datos que ya tenía el pensum de Hatha sembrado.
 * Va al principio del módulo que contiene Anatomía y el Laboratorio de asanas, y ese módulo recupera su nombre «Fundamentos del yoga».
 * En una base nueva no hace falta: el pensum inicial ya la trae.
 *
 *   node scripts/aplicar-fundamentos.ts
 *
 * Es seguro repetirlo.
 */
import { FUNDAMENTOS_DEL_YOGA } from "../src/data/pensum-seed.ts";
import { claimSuggestedClasses, ensureSeed } from "../src/server/classes.ts";
import { getDb, newId, nowIso } from "../src/server/db/index.ts";

const db = getDb();
const HATHA = "hatha-vinyasa-yoga-y-meditacion";
await ensureSeed(db, HATHA);

const email = FUNDAMENTOS_DEL_YOGA.teacherEmail!.toLowerCase();
let cls = await db.get<{ id: string }>("SELECT id FROM classes WHERE title = ?", [FUNDAMENTOS_DEL_YOGA.title]);

if (!cls) {
  const mod = await db.get<{ id: string }>(
    "SELECT id FROM curriculum_modules WHERE program_slug = ? AND title IN ('Anatomía y asanas', 'Fundamentos del yoga') ORDER BY position LIMIT 1",
    [HATHA],
  );
  if (!mod) {
    console.log("No encontré el módulo de Anatomía y asanas en Hatha; no cambié nada.");
  } else {
    await db.run("UPDATE curriculum_modules SET title = 'Fundamentos del yoga' WHERE id = ?", [mod.id]);
    await db.run("UPDATE module_classes SET position = position + 1 WHERE module_id = ?", [mod.id]);
    const classId = newId();
    const now = nowIso();
    await db.run("INSERT INTO classes (id, title, teacher_id, modality, suggested_teacher_email, created_at) VALUES (?, ?, NULL, 'virtual', ?, ?)", [classId, FUNDAMENTOS_DEL_YOGA.title, email, now]);
    await db.run("INSERT INTO module_classes (id, module_id, class_id, position) VALUES (?, ?, ?, 1)", [newId(), mod.id, classId]);
    for (const [i, l] of FUNDAMENTOS_DEL_YOGA.lessons!.entries()) {
      await db.run("INSERT INTO class_lessons (id, class_id, position, title, topics, created_at) VALUES (?, ?, ?, ?, ?, ?)", [newId(), classId, i + 1, l.title, l.topics.join("\n"), now]);
    }
    cls = { id: classId };
    console.log("Agregada «Fundamentos del yoga»: 8 clases.");
  }
}

if (cls) {
  const teacher = await db.get<{ id: string }>("SELECT id FROM users WHERE email = ? AND role IN ('teacher', 'admin') ORDER BY created_at LIMIT 1", [email]);
  if (teacher) {
    await claimSuggestedClasses(db, teacher.id, email);
    console.log("Asignada a la docente con cuenta:", email);
  } else {
    console.log(`Aún no hay cuenta para ${email}: la clase se le asignará sola cuando se cree.`);
  }
}
