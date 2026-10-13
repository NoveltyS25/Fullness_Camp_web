/**
 * Pone «Filosofía del yoga» (Nitya, 3 módulos y 10 clases) en una base de datos que ya tenía el pensum de Hatha sembrado con
 * «Historia y filosofía» dentro de «Fundamentos del yoga». En una base nueva no hace falta: el pensum inicial ya la trae.
 *
 *   node scripts/aplicar-filosofia.ts
 *
 * Es seguro repetirlo. Quita los horarios de demostración de la clase reemplazada y renombra el módulo «Fundamentos del yoga»
 * a «Anatomía y asanas» (para no confundirlo con «Filosofía del yoga: Fundamentos»).
 */
import { FILOSOFIA_DEL_YOGA } from "../src/data/pensum-seed.ts";
import { claimSuggestedClasses, ensureSeed } from "../src/server/classes.ts";
import { getDb, newId, nowIso } from "../src/server/db/index.ts";

const db = getDb();
const HATHA = "hatha-vinyasa-yoga-y-meditacion";
await ensureSeed(db, HATHA);

if (await db.get("SELECT 1 AS ok FROM curriculum_modules WHERE program_slug = ? AND title = ?", [HATHA, FILOSOFIA_DEL_YOGA[0].title])) {
  console.log("Filosofía del yoga ya estaba aplicada.");
} else {
  // 1) fuera la clase genérica «Historia y filosofía» (y sus horarios de demostración)
  const old = await db.get<{ id: string }>(
    `SELECT c.id FROM classes c JOIN module_classes mc ON mc.class_id = c.id JOIN curriculum_modules m ON m.id = mc.module_id
     WHERE m.program_slug = ? AND c.title = 'Historia y filosofía'`,
    [HATHA],
  );
  if (old) await db.run("DELETE FROM classes WHERE id = ?", [old.id]);

  // 2) el módulo que quedó con Anatomía y Asanas cambia de nombre y los 3 módulos nuevos van primero
  await db.run("UPDATE curriculum_modules SET title = 'Anatomía y asanas' WHERE program_slug = ? AND title = 'Fundamentos del yoga'", [HATHA]);
  await db.run("UPDATE curriculum_modules SET position = position + ? WHERE program_slug = ?", [FILOSOFIA_DEL_YOGA.length, HATHA]);

  const now = nowIso();
  const emails = new Set<string>();
  for (const [mi, m] of FILOSOFIA_DEL_YOGA.entries()) {
    const moduleId = newId();
    await db.run("INSERT INTO curriculum_modules (id, program_slug, position, title, created_at) VALUES (?, ?, ?, ?, ?)", [moduleId, HATHA, mi + 1, m.title, now]);
    for (const [ci, topic] of m.topics.entries()) {
      const spec = typeof topic === "string" ? { title: topic, teacherEmail: undefined } : topic;
      const classId = newId();
      const email = spec.teacherEmail?.toLowerCase() ?? null;
      if (email) emails.add(email);
      await db.run("INSERT INTO classes (id, title, teacher_id, modality, suggested_teacher_email, created_at) VALUES (?, ?, NULL, 'virtual', ?, ?)", [classId, spec.title, email, now]);
      await db.run("INSERT INTO module_classes (id, module_id, class_id, position) VALUES (?, ?, ?, ?)", [newId(), moduleId, classId, ci + 1]);
    }
  }
  console.log("Filosofía del yoga agregada: 3 módulos, 10 clases.");

  for (const email of emails) {
    const teacher = await db.get<{ id: string }>("SELECT id FROM users WHERE email = ? AND role IN ('teacher', 'admin') ORDER BY created_at LIMIT 1", [email]);
    if (teacher) {
      await claimSuggestedClasses(db, teacher.id, email);
      console.log("Asignadas a la docente con cuenta:", email);
    } else {
      console.log(`Aún no hay cuenta para ${email}: las clases se le asignarán solas cuando se cree.`);
    }
  }
}
