import { newId, nowIso, type Db } from "./db/index.ts";
import { getActiveCycle, type Actor, type Result } from "./classes.ts";

/**
 * Ciclos de una docente. Un ciclo se llama como el mes y el año en que se crea («Octubre 2027»), para que ni las docentes ni las
 * estudiantes se confundan. Al iniciar uno nuevo, el anterior se cierra: las estudiantes que ya aprobaron una asignatura no vuelven a ver
 * sus horarios, y quienes no la aprobaron la ven de nuevo en el ciclo nuevo.
 */

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const isStaff = (a: Actor) => a.role === "teacher" || a.role === "admin";

/** «Octubre 2027» a partir de una fecha, en hora de Colombia. */
export function cycleNameFor(date: Date): string {
  const local = new Date(date.getTime() - 5 * 3600_000);
  return `${MONTHS[local.getUTCMonth()]} ${local.getUTCFullYear()}`;
}

export type StartCycleResult = { ok: true; id: string; name: string } | { ok: false; error: string };

export async function startCycle(db: Db, actor: Actor, startsOn: string, now: Date = new Date()): Promise<StartCycleResult> {
  if (!isStaff(actor)) return { ok: false, error: "No tienes permiso." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || Number.isNaN(new Date(`${startsOn}T00:00:00-05:00`).getTime())) return { ok: false, error: "Elige la fecha en que inicia tu ciclo." };
  return db.transaction(async (tx): Promise<StartCycleResult> => {
    await tx.run("UPDATE teacher_cycles SET status = 'cerrado', closed_at = ? WHERE teacher_id = ? AND status = 'activo'", [nowIso(), actor.id]);
    const base = cycleNameFor(now);
    const same = await tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM teacher_cycles WHERE teacher_id = ? AND (name = ? OR name LIKE ?)", [actor.id, base, `${base} (%`]);
    const name = Number(same?.n ?? 0) === 0 ? base : `${base} (${Number(same?.n) + 1})`;
    const id = newId();
    await tx.run("INSERT INTO teacher_cycles (id, teacher_id, name, starts_on, status, created_at) VALUES (?, ?, ?, ?, 'activo', ?)", [id, actor.id, name, startsOn, nowIso()]);
    return { ok: true, id, name };
  });
}

export async function closeCycle(db: Db, actor: Actor, cycleId: string): Promise<Result> {
  const r = await db.run("UPDATE teacher_cycles SET status = 'cerrado', closed_at = ? WHERE id = ? AND teacher_id = ? AND status = 'activo'", [nowIso(), cycleId, actor.id]);
  return r.changes > 0 ? { ok: true } : { ok: false, error: "No encontramos un ciclo activo tuyo." };
}

export function listCycles(db: Db, teacherId: string) {
  return db.all<{ id: string; name: string; starts_on: string; status: "activo" | "cerrado"; created_at: string }>(
    "SELECT id, name, starts_on, status, created_at FROM teacher_cycles WHERE teacher_id = ? ORDER BY created_at DESC",
    [teacherId],
  );
}

export interface CycleClass {
  id: string;
  title: string;
  is_event: number;
  modality: string;
  /** Dónde aparece: certificado y módulo. */
  placements: { program_slug: string; module_title: string }[];
  lessons_total: number;
  /** Clases del temario con horario dentro de este ciclo (o sesiones sueltas, si la asignatura no tiene temario). */
  scheduled: number;
}

/** Las asignaturas de la docente (principal o adicional) con su avance de programación en el ciclo indicado. */
export async function getCycleClasses(db: Db, teacherId: string, cycleId: string | null): Promise<CycleClass[]> {
  const classes = await db.all<{ id: string; title: string; is_event: number; modality: string }>(
    `SELECT c.id, c.title, c.is_event, c.modality FROM classes c
     WHERE c.teacher_id = ? OR EXISTS (SELECT 1 FROM class_teachers ct WHERE ct.class_id = c.id AND ct.user_id = ?)
     ORDER BY c.is_event, c.title`,
    [teacherId, teacherId],
  );
  const out: CycleClass[] = [];
  for (const c of classes) {
    const placements = await db.all<{ program_slug: string; module_title: string }>(
      "SELECT m.program_slug, m.title AS module_title FROM module_classes mc JOIN curriculum_modules m ON m.id = mc.module_id WHERE mc.class_id = ? ORDER BY m.program_slug, m.position",
      [c.id],
    );
    const lessons = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM class_lessons WHERE class_id = ?", [c.id]);
    const cycleFilter = c.is_event || !cycleId ? "s.cycle_id IS NULL" : "s.cycle_id = ?";
    const params = c.is_event || !cycleId ? [c.id] : [c.id, cycleId];
    const scheduled = Number(lessons?.n ?? 0) > 0
      ? await db.get<{ n: number }>(`SELECT COUNT(DISTINCT s.lesson_id) AS n FROM sessions s WHERE s.class_id = ? AND s.lesson_id IS NOT NULL AND ${cycleFilter}`, params)
      : await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM sessions s WHERE s.class_id = ? AND ${cycleFilter}`, params);
    out.push({ ...c, placements, lessons_total: Number(lessons?.n ?? 0), scheduled: Number(scheduled?.n ?? 0) });
  }
  return out;
}

export { getActiveCycle };
