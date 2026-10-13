/**
 * Pone el «Laboratorio de asanas» (Lila Govardhan, 8 clases) en una base de datos que ya tenía el pensum de Hatha sembrado con
 * «Asanas: alineación, beneficios y secuencias». En una base nueva no hace falta: el pensum inicial ya la trae.
 *
 *   node scripts/aplicar-asanas.ts
 *
 * Es seguro repetirlo. Quita los horarios de demostración de la clase reemplazada.
 */
import { LABORATORIO_ASANAS } from "../src/data/pensum-seed.ts";
import { claimSuggestedClasses, ensureSeed } from "../src/server/classes.ts";
import { getDb, newId, nowIso } from "../src/server/db/index.ts";

const db = getDb();
const HATHA = "hatha-vinyasa-yoga-y-meditacion";
await ensureSeed(db, HATHA);

const email = LABORATORIO_ASANAS.teacherEmail!.toLowerCase();
let cls = await db.get<{ id: string }>("SELECT id FROM classes WHERE title = ?", [LABORATORIO_ASANAS.title]);

if (!cls) {
  const old = await db.get<{ id: string }>(
    `SELECT c.id FROM classes c JOIN module_classes mc ON mc.class_id = c.id JOIN curriculum_modules m ON m.id = mc.module_id
     WHERE m.program_slug = ? AND c.title = 'Asanas: alineación, beneficios y secuencias'`,
    [HATHA],
  );
  if (old) {
    await db.run("DELETE FROM sessions WHERE class_id = ?", [old.id]);
    await db.run("UPDATE classes SET title = ?, teacher_id = NULL, suggested_teacher_email = ? WHERE id = ?", [LABORATORIO_ASANAS.title, email, old.id]);
    cls = old;
    console.log("Clase «Asanas: alineación, beneficios y secuencias» reemplazada por «Laboratorio de asanas».");
  } else {
    console.log("No encontré la clase de Asanas en Hatha; no cambié nada.");
  }
}

if (cls) {
  const has = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM class_lessons WHERE class_id = ?", [cls.id]);
  if (Number(has?.n ?? 0) === 0) {
    for (const [i, l] of LABORATORIO_ASANAS.lessons!.entries()) {
      await db.run("INSERT INTO class_lessons (id, class_id, position, title, topics, created_at) VALUES (?, ?, ?, ?, ?, ?)", [newId(), cls.id, i + 1, l.title, l.topics.join("\n"), nowIso()]);
    }
    console.log(`Temario agregado: ${LABORATORIO_ASANAS.lessons!.length} clases.`);
  }
  const teacher = await db.get<{ id: string }>("SELECT id FROM users WHERE email = ? AND role IN ('teacher', 'admin') ORDER BY created_at LIMIT 1", [email]);
  if (teacher) {
    await claimSuggestedClasses(db, teacher.id, email);
    console.log("Asignada a la docente con cuenta:", email);
  } else {
    console.log(`Aún no hay cuenta para ${email}: la clase se le asignará sola cuando se cree.`);
  }
}
