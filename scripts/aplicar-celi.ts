/**
 * Pone la parte de Ayurveda de la Dra. Celi (7 clases) en una base de datos que ya tenía el pensum de Hatha sembrado.
 * Va después de la parte de Lila, antes de los talleres de cocina. En una base nueva no hace falta.
 *
 *   node scripts/aplicar-celi.ts
 *
 * Es seguro repetirlo.
 */
import { AYURVEDA_CELI } from "../src/data/pensum-seed.ts";
import { claimSuggestedClasses, ensureSeed } from "../src/server/classes.ts";
import { getDb, newId, nowIso } from "../src/server/db/index.ts";

const db = getDb();
const HATHA = "hatha-vinyasa-yoga-y-meditacion";
await ensureSeed(db, HATHA);

const email = AYURVEDA_CELI.teacherEmail!.toLowerCase();
let cls = await db.get<{ id: string }>("SELECT id FROM classes WHERE title = ?", [AYURVEDA_CELI.title]);

if (!cls) {
  const lila = await db.get<{ module_id: string; position: number }>(
    `SELECT mc.module_id, mc.position FROM module_classes mc JOIN classes c ON c.id = mc.class_id
     JOIN curriculum_modules m ON m.id = mc.module_id WHERE m.program_slug = ? AND c.title = 'Ayurveda: parte de Lila'`,
    [HATHA],
  );
  if (!lila) {
    console.log("No encontré la parte de Lila en Hatha; aplica antes scripts/aplicar-ayurveda.ts. No cambié nada.");
  } else {
    await db.run("UPDATE module_classes SET position = position + 1 WHERE module_id = ? AND position > ?", [lila.module_id, lila.position]);
    const classId = newId();
    const now = nowIso();
    await db.run("INSERT INTO classes (id, title, teacher_id, modality, suggested_teacher_email, created_at) VALUES (?, ?, NULL, 'virtual', ?, ?)", [classId, AYURVEDA_CELI.title, email, now]);
    await db.run("INSERT INTO module_classes (id, module_id, class_id, position) VALUES (?, ?, ?, ?)", [newId(), lila.module_id, classId, lila.position + 1]);
    for (const [i, l] of AYURVEDA_CELI.lessons!.entries()) {
      await db.run("INSERT INTO class_lessons (id, class_id, position, title, topics, created_at) VALUES (?, ?, ?, ?, ?, ?)", [newId(), classId, i + 1, l.title, l.topics.join("\n"), now]);
    }
    cls = { id: classId };
    console.log(`Agregada «${AYURVEDA_CELI.title}»: 7 clases.`);
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
