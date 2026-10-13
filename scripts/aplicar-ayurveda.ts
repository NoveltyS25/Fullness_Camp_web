/**
 * Pone la parte de Ayurveda de Lila Govardhan (4 clases) en una base de datos que ya tenía el pensum de Hatha sembrado con
 * «Introducción a la medicina Ayurveda» y «Doshas y gunas», que esta asignatura reemplaza. En una base nueva no hace falta.
 *
 *   node scripts/aplicar-ayurveda.ts
 *
 * Es seguro repetirlo. Los talleres de cocina ayurveda no se tocan.
 */
import { AYURVEDA_LILA } from "../src/data/pensum-seed.ts";
import { claimSuggestedClasses, ensureSeed } from "../src/server/classes.ts";
import { getDb, newId, nowIso } from "../src/server/db/index.ts";

const db = getDb();
const HATHA = "hatha-vinyasa-yoga-y-meditacion";
await ensureSeed(db, HATHA);

const email = AYURVEDA_LILA.teacherEmail!.toLowerCase();
let cls = await db.get<{ id: string }>("SELECT id FROM classes WHERE title = ?", [AYURVEDA_LILA.title]);

if (!cls) {
  const mod = await db.get<{ id: string }>(
    `SELECT m.id FROM curriculum_modules m JOIN module_classes mc ON mc.module_id = m.id JOIN classes c ON c.id = mc.class_id
     WHERE m.program_slug = ? AND c.title LIKE 'Taller de cocina ayurveda%' LIMIT 1`,
    [HATHA],
  );
  if (!mod) {
    console.log("No encontré el módulo de Ayurveda en Hatha; no cambié nada.");
  } else {
    const removed = await db.run(
      `DELETE FROM classes WHERE id IN (SELECT c.id FROM classes c JOIN module_classes mc ON mc.class_id = c.id WHERE mc.module_id = ?
         AND c.title IN ('Introducción a la medicina Ayurveda (medicina tradicional de la India)', 'Doshas y gunas'))`,
      [mod.id],
    );
    await db.run("UPDATE module_classes SET position = position + 1 WHERE module_id = ?", [mod.id]);
    const classId = newId();
    const now = nowIso();
    await db.run("INSERT INTO classes (id, title, teacher_id, modality, suggested_teacher_email, created_at) VALUES (?, ?, NULL, 'virtual', ?, ?)", [classId, AYURVEDA_LILA.title, email, now]);
    await db.run("INSERT INTO module_classes (id, module_id, class_id, position) VALUES (?, ?, ?, 1)", [newId(), mod.id, classId]);
    for (const [i, l] of AYURVEDA_LILA.lessons!.entries()) {
      await db.run("INSERT INTO class_lessons (id, class_id, position, title, topics, created_at) VALUES (?, ?, ?, ?, ?, ?)", [newId(), classId, i + 1, l.title, l.topics.join("\n"), now]);
    }
    cls = { id: classId };
    console.log(`Agregada «${AYURVEDA_LILA.title}»: 4 clases (se quitaron ${removed.changes} clases genéricas que ya cubre).`);
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
