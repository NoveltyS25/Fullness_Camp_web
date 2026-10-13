/**
 * Pone la asignatura «Anatomía y biomecánica del yoga» (Alexa Pabón, 8 clases) en una base de datos que ya tenía el pensum de Hatha
 * sembrado con «Biomecánica aplicada al yoga». En una base nueva no hace falta: el pensum inicial ya la trae.
 *
 *   node scripts/aplicar-anatomia.ts
 *
 * Es seguro repetirlo. Quita los horarios de demostración de la clase reemplazada.
 */
import { ANATOMIA_BIOMECANICA } from "../src/data/pensum-seed.ts";
import { claimSuggestedClasses, ensureSeed } from "../src/server/classes.ts";
import { getDb, newId, nowIso } from "../src/server/db/index.ts";

const db = getDb();
const HATHA = "hatha-vinyasa-yoga-y-meditacion";
await ensureSeed(db, HATHA);

const email = ANATOMIA_BIOMECANICA.teacherEmail!.toLowerCase();
let cls = await db.get<{ id: string }>("SELECT id FROM classes WHERE title = ?", [ANATOMIA_BIOMECANICA.title]);

if (!cls) {
  const old = await db.get<{ id: string }>(
    `SELECT c.id FROM classes c JOIN module_classes mc ON mc.class_id = c.id JOIN curriculum_modules m ON m.id = mc.module_id
     WHERE m.program_slug = ? AND c.title = 'Biomecánica aplicada al yoga'`,
    [HATHA],
  );
  if (old) {
    await db.run("DELETE FROM sessions WHERE class_id = ?", [old.id]);
    await db.run("UPDATE classes SET title = ?, teacher_id = NULL, suggested_teacher_email = ? WHERE id = ?", [ANATOMIA_BIOMECANICA.title, email, old.id]);
    cls = old;
    console.log("Clase «Biomecánica aplicada al yoga» reemplazada por «Anatomía y biomecánica del yoga».");
  } else {
    console.log("No encontré «Biomecánica aplicada al yoga» en Hatha; no cambié nada.");
  }
}

if (cls) {
  const has = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM class_lessons WHERE class_id = ?", [cls.id]);
  if (Number(has?.n ?? 0) === 0) {
    for (const [i, l] of ANATOMIA_BIOMECANICA.lessons!.entries()) {
      await db.run("INSERT INTO class_lessons (id, class_id, position, title, topics, created_at) VALUES (?, ?, ?, ?, ?, ?)", [newId(), cls.id, i + 1, l.title, l.topics.join("\n"), nowIso()]);
    }
    console.log(`Temario agregado: ${ANATOMIA_BIOMECANICA.lessons!.length} clases.`);
  }
  const teacher = await db.get<{ id: string }>("SELECT id FROM users WHERE email = ? AND role IN ('teacher', 'admin') ORDER BY created_at LIMIT 1", [email]);
  if (teacher) {
    await claimSuggestedClasses(db, teacher.id, email);
    console.log("Asignada a la docente con cuenta:", email);
  } else {
    console.log(`Aún no hay cuenta para ${email}: la clase se le asignará sola cuando se cree.`);
  }
}
