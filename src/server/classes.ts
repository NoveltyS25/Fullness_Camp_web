import { ASIGNATURAS, CERTIFICACIONES } from "../data/pensum-seed.ts";
import { effectiveStatus, TEACHER_CHOICES, type ProgressStatus } from "../lib/campus/progress.ts";
import { newId, nowIso, type Db } from "./db/index.ts";
import type { User } from "./users.ts";

/**
 * Modelo del campus:
 *  - Una CLASE es lo que dicta una docente («Marketing», «Biomecánica»…). Ella define sus horarios (sesiones).
 *  - La administración arma cada CERTIFICACIÓN: módulos, y dentro de cada módulo las clases que tiene.
 *  - Una misma clase puede estar en varias certificaciones: sus estudiantes son las de todas ellas.
 */

export type Modality = "presencial" | "virtual" | "mixta";
export const MODALITIES: Record<Modality, string> = { presencial: "Presencial", virtual: "Virtual", mixta: "Presencial y virtual" };

export type Actor = Pick<User, "id" | "role">;
export type Result = { ok: true } | { ok: false; error: string };

const isStaff = (a: Actor) => a.role === "teacher" || a.role === "admin";

/** Nombres de todas las docentes de una asignatura (la principal primero), listos para mostrar: «Lila Govardhan y Diana Flores». */
export const TEACHER_NAMES_SQL = `(SELECT GROUP_CONCAT(n, '|') FROM (
  SELECT u0.full_name AS n FROM users u0 WHERE u0.id = c.teacher_id
  UNION ALL SELECT u1.full_name FROM class_teachers ct JOIN users u1 ON u1.id = ct.user_id WHERE ct.class_id = c.id))`;

export function joinNames(raw: string | null): string | null {
  if (!raw) return null;
  const names = raw.split("|").filter(Boolean);
  return names.length <= 1 ? (names[0] ?? null) : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

/** Sesiones «vigentes»: las de un ciclo activo y las sueltas (eventos y horarios anteriores a los ciclos). */
export const CURRENT_SESSION = (alias = "s") =>
  `(${alias}.cycle_id IS NULL OR EXISTS (SELECT 1 FROM teacher_cycles tc WHERE tc.id = ${alias}.cycle_id AND tc.status = 'activo'))`;

/** ¿Es la docente principal o una de las docentes adicionales de la asignatura? */
export async function isClassTeacher(db: Db, userId: string, classId: string): Promise<boolean> {
  return !!(await db.get(
    "SELECT 1 AS ok FROM classes c WHERE c.id = ? AND (c.teacher_id = ? OR EXISTS (SELECT 1 FROM class_teachers ct WHERE ct.class_id = c.id AND ct.user_id = ?))",
    [classId, userId, userId],
  ));
}

export function getActiveCycle(db: Db, teacherId: string) {
  return db.get<{ id: string; name: string; starts_on: string }>("SELECT id, name, starts_on FROM teacher_cycles WHERE teacher_id = ? AND status = 'activo' ORDER BY created_at DESC LIMIT 1", [teacherId]);
}
const isModality = (m: string): m is Modality => m in MODALITIES;

// ------------------------------------------------------------------ pensum de una certificación

export interface ClassItem {
  is_event: number;
  placement_id: string;
  class_id: string;
  title: string;
  teacher_id: string | null;
  teacher_name: string | null;
  modality: Modality;
  /** Clases futuras programadas (no canceladas). */
  upcoming_count: number;
  next_start: string | null;
  next_end: string | null;
  /** Temario por encuentros, con su fecha si la docente ya la programó. */
  lessons: LessonRow[];
}

export interface LessonRow {
  id: string;
  title: string;
  topics: string[];
  starts_at: string | null;
  ends_at: string | null;
  session_id: string | null;
  status: "scheduled" | "cancelled" | null;
}

export interface PensumModule {
  id: string;
  title: string;
  classes: ClassItem[];
}

/**
 * Siembra la organización de un certificado la primera vez que se pide (una sola vez): «Módulo 1», «Módulo 2»… con sus asignaturas.
 * Las asignaturas compartidas entre certificados se crean una sola vez (se reconocen por su clave) y quedan a nombre de su docente
 * si ya tiene cuenta; si no, en cuanto se cree (ver claimSuggestedClasses).
 */
export async function ensureSeed(db: Db, programSlug: string): Promise<void> {
  const modulesSeed = CERTIFICACIONES[programSlug];
  if (!modulesSeed) return;
  await db.transaction(async (tx) => {
    if (await tx.get("SELECT 1 AS ok FROM curriculum_seeded WHERE program_slug = ?", [programSlug])) return;
    const now = nowIso();
    const userByEmail = async (email: string) =>
      (await tx.get<{ id: string }>("SELECT id FROM users WHERE email = ? AND role IN ('teacher', 'admin') ORDER BY created_at LIMIT 1", [email.toLowerCase()]))?.id ?? null;

    for (const [mi, keys] of modulesSeed.entries()) {
      const moduleId = newId();
      await tx.run("INSERT INTO curriculum_modules (id, program_slug, position, title, created_at) VALUES (?, ?, ?, ?, ?)", [moduleId, programSlug, mi + 1, `Módulo ${mi + 1}`, now]);
      for (const [ci, key] of keys.entries()) {
        const spec = ASIGNATURAS[key];
        if (!spec) throw new Error(`Asignatura desconocida en el pensum inicial: ${key}`);
        let classId = (await tx.get<{ id: string }>("SELECT id FROM classes WHERE seed_key = ?", [key]))?.id;
        if (!classId) {
          classId = newId();
          const email = spec.teacherEmail.toLowerCase();
          const co = (spec.coTeacherEmails ?? []).map((e) => e.toLowerCase());
          await tx.run(
            `INSERT INTO classes (id, title, teacher_id, modality, description, suggested_teacher_email, suggested_coteacher_emails, seed_key, is_event, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [classId, spec.title, await userByEmail(email), spec.modality ?? "virtual", spec.description ?? null, email, co.join(",") || null, key, spec.event ? 1 : 0, now],
          );
          for (const e of co) {
            const uid = await userByEmail(e);
            if (uid) await tx.run("INSERT INTO class_teachers (class_id, user_id) VALUES (?, ?)", [classId, uid]);
          }
          for (const [li, lesson] of (spec.lessons ?? []).entries()) {
            await tx.run("INSERT INTO class_lessons (id, class_id, position, title, topics, created_at) VALUES (?, ?, ?, ?, ?, ?)", [newId(), classId, li + 1, lesson.title, lesson.topics.join("\n"), now]);
          }
        }
        await tx.run("INSERT INTO module_classes (id, module_id, class_id, position) VALUES (?, ?, ?, ?)", [newId(), moduleId, classId, ci + 1]);
      }
    }
    await tx.run("INSERT INTO curriculum_seeded (program_slug) VALUES (?)", [programSlug]);
  });
}

export async function getPensum(db: Db, programSlug: string): Promise<PensumModule[]> {
  await ensureSeed(db, programSlug);
  const modules = await db.all<{ id: string; title: string }>("SELECT id, title FROM curriculum_modules WHERE program_slug = ? ORDER BY position", [programSlug]);
  const now = nowIso();
  const items = await db.all<ClassItem & { module_id: string }>(
    `SELECT mc.id AS placement_id, mc.module_id, c.id AS class_id, c.title, c.teacher_id, ${TEACHER_NAMES_SQL} AS teacher_name, c.modality, c.is_event,
            (SELECT COUNT(*) FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled' AND s.ends_at >= ? AND ${CURRENT_SESSION()}) AS upcoming_count,
            (SELECT MIN(s.starts_at) FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled' AND s.ends_at >= ? AND ${CURRENT_SESSION()}) AS next_start,
            (SELECT s.ends_at FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled' AND s.ends_at >= ? AND ${CURRENT_SESSION()} ORDER BY s.starts_at LIMIT 1) AS next_end
     FROM module_classes mc
     JOIN curriculum_modules m ON m.id = mc.module_id
     JOIN classes c ON c.id = mc.class_id
     WHERE m.program_slug = ? ORDER BY mc.position`,
    [now, now, now, programSlug],
  );
  const lessonsByClass = new Map<string, LessonRow[]>();
  for (const classId of new Set(items.map((i) => i.class_id))) lessonsByClass.set(classId, await getClassLessons(db, classId));
  return modules.map((m) => ({
    ...m,
    classes: items.filter((i) => i.module_id === m.id).map((i) => ({ ...i, teacher_name: joinNames(i.teacher_name), upcoming_count: Number(i.upcoming_count), lessons: lessonsByClass.get(i.class_id) ?? [] })),
  }));
}

/** Temario de una clase, cada encuentro con su horario (si ya tiene). */
export async function getClassLessons(db: Db, classId: string): Promise<LessonRow[]> {
  const rows = await db.all<{ id: string; title: string; topics: string; starts_at: string | null; ends_at: string | null; session_id: string | null; status: "scheduled" | "cancelled" | null }>(
    `SELECT l.id, l.title, l.topics, s.starts_at, s.ends_at, s.id AS session_id, s.status
     FROM class_lessons l LEFT JOIN sessions s ON s.lesson_id = l.id AND ${CURRENT_SESSION()}
     WHERE l.class_id = ? ORDER BY l.position`,
    [classId],
  );
  return rows.map((r) => ({ ...r, topics: r.topics ? r.topics.split("\n").filter(Boolean) : [] }));
}

/** Programas que ya tienen pensum (o tienen uno inicial por sembrar). */
export async function programsWithPensum(db: Db): Promise<Set<string>> {
  for (const slug of Object.keys(CERTIFICACIONES)) await ensureSeed(db, slug);
  const rows = await db.all<{ program_slug: string }>("SELECT DISTINCT program_slug FROM curriculum_modules");
  return new Set(rows.map((r) => r.program_slug));
}

export interface TeacherCard {
  user_id: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  photo_url: string | null;
  classes: string[];
}

/** Docentes que dictan al menos una clase de la certificación, con su perfil y sus clases. */
export async function getProgramTeachers(db: Db, programSlug: string): Promise<TeacherCard[]> {
  const rows = await db.all<{ user_id: string; full_name: string; class_title: string }>(
    `SELECT t.user_id, u.full_name, c.title AS class_title FROM (
       SELECT c0.id AS class_id, c0.teacher_id AS user_id FROM classes c0 WHERE c0.teacher_id IS NOT NULL
       UNION SELECT ct.class_id, ct.user_id FROM class_teachers ct) t
     JOIN classes c ON c.id = t.class_id JOIN users u ON u.id = t.user_id
     JOIN module_classes mc ON mc.class_id = c.id JOIN curriculum_modules m ON m.id = mc.module_id
     WHERE m.program_slug = ? ORDER BY u.full_name, m.position, mc.position`,
    [programSlug],
  );
  const cards = new Map<string, TeacherCard>();
  for (const r of rows) {
    const c = cards.get(r.user_id) ?? { user_id: r.user_id, full_name: r.full_name, headline: null, bio: null, contact_email: null, contact_phone: null, photo_url: null, classes: [] };
    c.classes.push(r.class_title);
    cards.set(r.user_id, c);
  }
  for (const c of cards.values()) {
    const p = await db.get<Omit<TeacherCard, "user_id" | "full_name" | "classes">>("SELECT headline, bio, contact_email, contact_phone, photo_url FROM teacher_profiles WHERE user_id = ?", [c.user_id]);
    if (p) Object.assign(c, p);
  }
  return [...cards.values()];
}

export function listTeachers(db: Db): Promise<{ id: string; full_name: string }[]> {
  return db.all("SELECT id, full_name FROM users WHERE role IN ('teacher', 'admin') ORDER BY full_name");
}

// ------------------------------------------------------------------ clases

export interface ClassRow {
  id: string;
  title: string;
  teacher_id: string | null;
  teacher_name: string | null;
  modality: Modality;
  description: string | null;
  is_event: number;
  upcoming_count: number;
  /** Certificaciones (program_slug) donde está la clase. */
  programs: string[];
}

const CLASS_SELECT = `SELECT c.id, c.title, c.teacher_id, ${TEACHER_NAMES_SQL} AS teacher_name, c.modality, c.description, c.is_event,
  (SELECT COUNT(*) FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled' AND s.ends_at >= ? AND ${CURRENT_SESSION()}) AS upcoming_count
  FROM classes c`;

async function withPrograms(db: Db, rows: Omit<ClassRow, "programs">[]): Promise<ClassRow[]> {
  const out: ClassRow[] = [];
  for (const r of rows) {
    const p = await db.all<{ program_slug: string }>(
      "SELECT DISTINCT m.program_slug FROM module_classes mc JOIN curriculum_modules m ON m.id = mc.module_id WHERE mc.class_id = ? ORDER BY m.program_slug",
      [r.id],
    );
    out.push({ ...r, teacher_name: joinNames(r.teacher_name), upcoming_count: Number(r.upcoming_count), programs: p.map((x) => x.program_slug) });
  }
  return out;
}

export async function listClasses(db: Db): Promise<ClassRow[]> {
  return withPrograms(db, await db.all<Omit<ClassRow, "programs">>(`${CLASS_SELECT} ORDER BY c.title`, [nowIso()]));
}

export async function getTeacherClasses(db: Db, teacherId: string): Promise<ClassRow[]> {
  return withPrograms(db, await db.all<Omit<ClassRow, "programs">>(`${CLASS_SELECT} WHERE c.teacher_id = ? OR EXISTS (SELECT 1 FROM class_teachers ct WHERE ct.class_id = c.id AND ct.user_id = ?) ORDER BY c.title`, [nowIso(), teacherId, teacherId]));
}

export async function getClass(db: Db, classId: string): Promise<ClassRow | undefined> {
  const rows = await withPrograms(db, await db.all<Omit<ClassRow, "programs">>(`${CLASS_SELECT} WHERE c.id = ?`, [nowIso(), classId]));
  return rows[0];
}

/** Una docente solo ve y edita sus clases; la administración, todas. */
export async function getClassForActor(db: Db, actor: Actor, classId: string): Promise<ClassRow | undefined> {
  const c = await getClass(db, classId);
  if (!c) return undefined;
  return actor.role === "admin" || (await isClassTeacher(db, actor.id, classId)) ? c : undefined;
}

export interface ClassInput {
  title: string;
  modality: string;
  description: string;
  /** Solo la administración puede elegir otra docente. "" = sin docente. */
  teacherId?: string;
}

export async function createClass(db: Db, actor: Actor, i: ClassInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!isStaff(actor)) return { ok: false, error: "No tienes permiso." };
  const title = i.title.trim().slice(0, 160);
  if (title.length < 2) return { ok: false, error: "Escribe el nombre de la clase." };
  if (!isModality(i.modality)) return { ok: false, error: "Elige si es presencial, virtual o mixta." };
  const teacherId = actor.role === "admin" ? i.teacherId || null : actor.id;
  if (teacherId && !(await db.get("SELECT 1 AS ok FROM users WHERE id = ? AND role IN ('teacher', 'admin')", [teacherId]))) return { ok: false, error: "Esa persona no es docente." };
  const id = newId();
  await db.run("INSERT INTO classes (id, title, teacher_id, modality, description, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
    id, title, teacherId, i.modality, i.description.trim().slice(0, 600) || null, nowIso(),
  ]);
  return { ok: true, id };
}

export interface NewClassInput extends ClassInput {
  startsAt: string; // ISO UTC de la primera clase
  endsAt: string;
  weeks: number;
  location: string;
  onlineUrl: string;
}

/**
 * Crea la clase junto con su primer horario, con todos los datos obligatorios, para que aparezca de inmediato en el calendario.
 * Presencial pide el lugar, virtual pide el enlace y mixta pide los dos.
 */
export async function createClassWithSessions(db: Db, actor: Actor, i: NewClassInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!isStaff(actor)) return { ok: false, error: "No tienes permiso." };
  if (i.title.trim().length < 2) return { ok: false, error: "Escribe el nombre de la clase." };
  if (!isModality(i.modality)) return { ok: false, error: "Elige si es presencial, virtual o mixta." };
  if (i.description.trim().length < 5) return { ok: false, error: "Escribe una descripción corta de la clase." };
  if (!Number.isInteger(i.weeks) || i.weeks < 1 || i.weeks > 40) return { ok: false, error: "Indica entre 1 y 40 semanas." };
  if (!i.startsAt || !i.endsAt) return { ok: false, error: "Indica la fecha y la hora de inicio y de fin." };
  if (new Date(i.endsAt) <= new Date(i.startsAt)) return { ok: false, error: "La hora de fin debe ser después de la de inicio." };
  const needsPlace = i.modality !== "virtual";
  const needsLink = i.modality !== "presencial";
  if (needsPlace && !i.location.trim()) return { ok: false, error: "Escribe el lugar donde será la clase presencial." };
  if (needsLink && !/^https?:\/\/\S+$/.test(i.onlineUrl.trim())) return { ok: false, error: "Pega el enlace de la clase virtual (empieza por https://)." };

  class Rollback extends Error {}
  try {
    return await db.transaction(async (tx) => {
    const created = await createClass(tx, actor, i);
    if (!created.ok) return created;
    const sessions = await addClassSessions(tx, actor, {
      classId: created.id,
      title: "",
      startsAt: i.startsAt,
      endsAt: i.endsAt,
      weeks: i.weeks,
      location: needsPlace ? i.location.trim() : null,
      onlineUrl: needsLink ? i.onlineUrl.trim() : null,
    });
    if (!sessions.ok) throw new Rollback(sessions.error);
    return created;
    });
  } catch (e) {
    if (e instanceof Rollback) return { ok: false, error: e.message }; // la clase no queda a medias
    throw e;
  }
}

export async function updateClass(db: Db, actor: Actor, classId: string, i: ClassInput): Promise<Result> {
  const c = await getClassForActor(db, actor, classId);
  if (!c) return { ok: false, error: "No tienes permiso para cambiar esta clase." };
  const title = i.title.trim().slice(0, 160);
  if (title.length < 2) return { ok: false, error: "Escribe el nombre de la clase." };
  if (!isModality(i.modality)) return { ok: false, error: "Elige si es presencial, virtual o mixta." };
  let teacherId = c.teacher_id;
  if (actor.role === "admin" && i.teacherId !== undefined) {
    teacherId = i.teacherId || null;
    if (teacherId && !(await db.get("SELECT 1 AS ok FROM users WHERE id = ? AND role IN ('teacher', 'admin')", [teacherId]))) return { ok: false, error: "Esa persona no es docente." };
  }
  await db.run("UPDATE classes SET title = ?, modality = ?, description = ?, teacher_id = ? WHERE id = ?", [title, i.modality, i.description.trim().slice(0, 600) || null, teacherId, classId]);
  return { ok: true };
}

/** Borrar una clase borra sus horarios. La docente solo puede borrar las suyas que no estén en ninguna certificación. */
export async function deleteClass(db: Db, actor: Actor, classId: string): Promise<Result> {
  const c = await getClassForActor(db, actor, classId);
  if (!c) return { ok: false, error: "No tienes permiso para borrar esta clase." };
  if (actor.role !== "admin" && c.programs.length > 0) return { ok: false, error: "Esta clase está en una certificación. Pídele a la administración que la quite." };
  if (actor.role !== "admin" && c.teacher_id !== actor.id) return { ok: false, error: "Solo la docente titular puede borrar la clase." };
  await db.run("DELETE FROM classes WHERE id = ?", [classId]);
  return { ok: true };
}

// ------------------------------------------------------------------ armar la certificación (administración)

export async function addModule(db: Db, actor: Actor, programSlug: string, title: string): Promise<Result> {
  if (actor.role !== "admin") return { ok: false, error: "Solo la administración agrega módulos." };
  const clean = title.trim().slice(0, 140);
  if (clean.length < 2) return { ok: false, error: "Escribe el nombre del módulo." };
  const last = await db.get<{ p: number | null }>("SELECT MAX(position) AS p FROM curriculum_modules WHERE program_slug = ?", [programSlug]);
  await db.run("INSERT INTO curriculum_modules (id, program_slug, position, title, created_at) VALUES (?, ?, ?, ?, ?)", [newId(), programSlug, Number(last?.p ?? 0) + 1, clean, nowIso()]);
  return { ok: true };
}

/** Quitar un módulo saca sus clases de la certificación; las clases y sus horarios no se borran. */
export async function deleteModule(db: Db, actor: Actor, moduleId: string): Promise<Result> {
  if (actor.role !== "admin") return { ok: false, error: "Solo la administración quita módulos." };
  await db.run("DELETE FROM curriculum_modules WHERE id = ?", [moduleId]);
  return { ok: true };
}

export async function placeClass(db: Db, actor: Actor, moduleId: string, classId: string): Promise<Result> {
  if (actor.role !== "admin") return { ok: false, error: "Solo la administración arma las certificaciones." };
  if (!(await db.get("SELECT 1 AS ok FROM curriculum_modules WHERE id = ?", [moduleId]))) return { ok: false, error: "No encontramos ese módulo." };
  if (!(await db.get("SELECT 1 AS ok FROM classes WHERE id = ?", [classId]))) return { ok: false, error: "No encontramos esa clase." };
  if (await db.get("SELECT 1 AS ok FROM module_classes WHERE module_id = ? AND class_id = ?", [moduleId, classId])) return { ok: false, error: "Esa clase ya está en este módulo." };
  const last = await db.get<{ p: number | null }>("SELECT MAX(position) AS p FROM module_classes WHERE module_id = ?", [moduleId]);
  await db.run("INSERT INTO module_classes (id, module_id, class_id, position) VALUES (?, ?, ?, ?)", [newId(), moduleId, classId, Number(last?.p ?? 0) + 1]);
  return { ok: true };
}

export async function unplaceClass(db: Db, actor: Actor, placementId: string): Promise<Result> {
  if (actor.role !== "admin") return { ok: false, error: "Solo la administración arma las certificaciones." };
  await db.run("DELETE FROM module_classes WHERE id = ?", [placementId]);
  return { ok: true };
}

// ------------------------------------------------------------------ horarios (sesiones) de una clase

const WEEK = 7 * 24 * 3600_000;

export interface AddSessionsInput {
  classId: string;
  title: string;
  startsAt: string; // ISO UTC
  endsAt: string;
  weeks: number;
  location: string | null;
  onlineUrl: string | null;
}

/**
 * ¿En qué ciclo cae un horario nuevo? Los eventos (retiros, talleres presenciales) no tienen ciclo. La administración, cuando programa una
 * clase ajena, tampoco. La docente de la clase necesita su ciclo activo: primero lo inicia.
 */
export async function cycleForNewSessions(db: Db, actor: Actor, c: { id: string; is_event: number }): Promise<{ ok: true; cycleId: string | null } | { ok: false; error: string }> {
  if (c.is_event) return { ok: true, cycleId: null };
  if (actor.role === "admin" && !(await isClassTeacher(db, actor.id, c.id))) return { ok: true, cycleId: null };
  const cycle = await getActiveCycle(db, actor.id);
  if (!cycle) return { ok: false, error: "Para programar clases primero inicia tu ciclo (botón «Iniciar ciclo» en Mis clases)." };
  return { ok: true, cycleId: cycle.id };
}

/** Al empezar una asignatura en un ciclo nuevo, quienes no la aprobaron vuelven a pendiente/en curso automático (el resultado anterior queda en el historial). */
async function resetForNewCycle(db: Db, classId: string, cycleId: string | null): Promise<void> {
  if (!cycleId) return;
  if (await db.get("SELECT 1 AS ok FROM sessions WHERE class_id = ? AND cycle_id = ?", [classId, cycleId])) return; // ya empezó en este ciclo
  await db.run("DELETE FROM class_progress WHERE class_id = ? AND status IN ('no_aprobado', 'en_curso')", [classId]);
}

/** Crea un encuentro o lo repite cada semana. Colombia no cambia de hora, así que +7 días exactos mantiene la hora. */
export async function addClassSessions(db: Db, actor: Actor, s: AddSessionsInput): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const c = await getClassForActor(db, actor, s.classId);
  if (!c) return { ok: false, error: "No tienes permiso para cambiar los horarios de esta clase." };
  if (new Date(s.endsAt) <= new Date(s.startsAt)) return { ok: false, error: "La hora de fin debe ser después de la de inicio." };
  const weeks = Math.min(40, Math.max(1, Math.trunc(s.weeks) || 1));
  const title = s.title.trim().slice(0, 160) || c.title;
  const where = await cycleForNewSessions(db, actor, c);
  if (!where.ok) return where;
  await db.transaction(async (tx) => {
    await resetForNewCycle(tx, s.classId, where.cycleId);
    for (let i = 0; i < weeks; i++) {
      await tx.run("INSERT INTO sessions (id, class_id, cycle_id, title, starts_at, ends_at, location, online_url, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)", [
        newId(), s.classId, where.cycleId, weeks > 1 ? `${title} (${i + 1}/${weeks})` : title,
        new Date(new Date(s.startsAt).getTime() + i * WEEK).toISOString(),
        new Date(new Date(s.endsAt).getTime() + i * WEEK).toISOString(),
        s.location, s.onlineUrl, nowIso(),
      ]);
    }
  });
  return { ok: true, created: weeks };
}

// ------------------------------------------------------------------ temario por encuentros

export async function addLesson(db: Db, actor: Actor, classId: string, title: string, topics: string): Promise<Result> {
  if (!(await getClassForActor(db, actor, classId))) return { ok: false, error: "No tienes permiso para cambiar esta clase." };
  const clean = title.trim().slice(0, 200);
  if (clean.length < 2) return { ok: false, error: "Escribe el título de la clase." };
  const list = topics.split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 40);
  const last = await db.get<{ p: number | null }>("SELECT MAX(position) AS p FROM class_lessons WHERE class_id = ?", [classId]);
  await db.run("INSERT INTO class_lessons (id, class_id, position, title, topics, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
    newId(), classId, Number(last?.p ?? 0) + 1, clean, list.join("\n"), nowIso(),
  ]);
  return { ok: true };
}

/** Quitar un encuentro del temario borra también su horario. */
export async function deleteLesson(db: Db, actor: Actor, lessonId: string): Promise<Result> {
  const l = await db.get<{ class_id: string }>("SELECT class_id FROM class_lessons WHERE id = ?", [lessonId]);
  if (!l || !(await getClassForActor(db, actor, l.class_id))) return { ok: false, error: "No tienes permiso para cambiar esta clase." };
  await db.transaction(async (tx) => {
    await tx.run("DELETE FROM sessions WHERE lesson_id = ?", [lessonId]);
    await tx.run("DELETE FROM class_lessons WHERE id = ?", [lessonId]);
  });
  return { ok: true };
}

export interface ScheduleLessonInput {
  lessonId: string;
  startsAt: string; // ISO UTC
  endsAt: string;
  location: string;
  onlineUrl: string;
}

/** Le pone fecha, hora y lugar o enlace a un encuentro del temario (según la modalidad de la clase). */
export async function scheduleLesson(db: Db, actor: Actor, i: ScheduleLessonInput): Promise<Result> {
  const l = await db.get<{ class_id: string; title: string }>("SELECT class_id, title FROM class_lessons WHERE id = ?", [i.lessonId]);
  const c = l ? await getClassForActor(db, actor, l.class_id) : undefined;
  if (!l || !c) return { ok: false, error: "No tienes permiso para cambiar esta clase." };
  if (new Date(i.endsAt) <= new Date(i.startsAt)) return { ok: false, error: "La hora de fin debe ser después de la de inicio." };
  const needsPlace = c.modality !== "virtual";
  const needsLink = c.modality !== "presencial";
  if (needsPlace && !i.location.trim()) return { ok: false, error: "Escribe el lugar donde será la clase presencial." };
  if (needsLink && !/^https?:\/\/\S+$/.test(i.onlineUrl.trim())) return { ok: false, error: "Pega el enlace de la clase virtual (empieza por https://)." };
  if (await db.get(`SELECT 1 AS ok FROM sessions s WHERE s.lesson_id = ? AND ${CURRENT_SESSION()}`, [i.lessonId])) return { ok: false, error: "Esta clase ya tiene horario en el ciclo actual. Para moverla usa «Cambiar horario»: así se avisa a las estudiantes." };
  const where = await cycleForNewSessions(db, actor, c);
  if (!where.ok) return where;

  await db.transaction(async (tx) => {
    await resetForNewCycle(tx, c.id, where.cycleId);
    await tx.run("INSERT INTO sessions (id, class_id, lesson_id, cycle_id, title, starts_at, ends_at, location, online_url, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)", [
      newId(), c.id, i.lessonId, where.cycleId, l.title, i.startsAt, i.endsAt, needsPlace ? i.location.trim() : null, needsLink ? i.onlineUrl.trim() : null, nowIso(),
    ]);
  });
  return { ok: true };
}

/** Asigna a esta docente las clases que la administración dejó previstas para su correo. */
export async function claimSuggestedClasses(db: Db, userId: string, email: string): Promise<number> {
  const mail = email.toLowerCase();
  const lead = await db.run("UPDATE classes SET teacher_id = ? WHERE teacher_id IS NULL AND suggested_teacher_email = ?", [userId, mail]);
  // Docentes adicionales previstas (correos separados por coma).
  const co = await db.all<{ id: string; teacher_id: string | null }>(
    "SELECT id, teacher_id FROM classes WHERE suggested_coteacher_emails IS NOT NULL AND (',' || suggested_coteacher_emails || ',') LIKE ?",
    [`%,${mail},%`],
  );
  let extra = 0;
  for (const c of co) {
    if (c.teacher_id === userId) continue;
    const r = await db.run("INSERT OR IGNORE INTO class_teachers (class_id, user_id) VALUES (?, ?)", [c.id, userId]);
    extra += r.changes;
  }
  return lead.changes + extra;
}

// ------------------------------------------------------------------ avance de las estudiantes (aprobó, en curso, pendiente)

export interface ProgressClass {
  class_id: string;
  title: string;
  teacher_name: string | null;
  status: ProgressStatus;
  /** true si lo decidió la docente; false si es automático según las fechas. */
  decided: boolean;
  /** Inicio del ciclo: la primera clase programada de la asignatura. */
  cycle_start: string | null;
  cycle_end: string | null;
}

export interface ProgressModule {
  id: string;
  title: string;
  classes: ProgressClass[];
}

export interface StudentProgress {
  modules: ProgressModule[];
  total: number;
  approved: number;
  inCourse: number;
  pending: number;
  notApproved: number;
  /** Aprobó todas las asignaturas de la certificación (falta, además, la tesina y la confirmación de la escuela). */
  allApproved: boolean;
}

/** Qué ha visto la estudiante de una certificación, en el orden del pensum, y qué le falta para graduarse. */
export async function getStudentProgress(db: Db, userId: string, programSlug: string, now: Date = new Date()): Promise<StudentProgress> {
  await ensureSeed(db, programSlug);
  const rows = await db.all<{
    module_id: string; module_title: string; class_id: string; title: string; teacher_name: string | null;
    explicit: ProgressStatus | null; cycle_start: string | null; cycle_end: string | null;
  }>(
    `SELECT m.id AS module_id, m.title AS module_title, c.id AS class_id, c.title, ${TEACHER_NAMES_SQL} AS teacher_name, p.status AS explicit,
            (SELECT MIN(s.starts_at) FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled' AND ${CURRENT_SESSION()}) AS cycle_start,
            (SELECT MAX(s.ends_at) FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled' AND ${CURRENT_SESSION()}) AS cycle_end
     FROM curriculum_modules m
     JOIN module_classes mc ON mc.module_id = m.id
     JOIN classes c ON c.id = mc.class_id
     LEFT JOIN class_progress p ON p.class_id = c.id AND p.user_id = ?
     WHERE m.program_slug = ? ORDER BY m.position, mc.position`,
    [userId, programSlug],
  );
  const modules: ProgressModule[] = [];
  const seen = new Set<string>();
  const count: Record<ProgressStatus, number> = { pendiente: 0, en_curso: 0, aprobado: 0, no_aprobado: 0 };
  for (const r of rows) {
    let mod = modules.find((m) => m.id === r.module_id);
    if (!mod) modules.push((mod = { id: r.module_id, title: r.module_title, classes: [] }));
    const status = effectiveStatus(r.explicit, r.cycle_start, now);
    mod.classes.push({ class_id: r.class_id, title: r.title, teacher_name: joinNames(r.teacher_name), status, decided: r.explicit !== null, cycle_start: r.cycle_start, cycle_end: r.cycle_end });
    if (!seen.has(r.class_id)) {
      seen.add(r.class_id);
      count[status]++;
    }
  }
  const total = seen.size;
  return { modules, total, approved: count.aprobado, inCourse: count.en_curso, pending: count.pendiente, notApproved: count.no_aprobado, allApproved: total > 0 && count.aprobado === total };
}

export interface ClassStudentProgress extends ClassStudent {
  status: ProgressStatus;
  decided: boolean;
}

/** Estudiantes de la clase con su estado en ella (para que la docente lo marque). */
export async function getClassStudentsProgress(db: Db, classId: string, now: Date = new Date()): Promise<ClassStudentProgress[]> {
  const cycle = await db.get<{ cycle_start: string | null }>("SELECT MIN(starts_at) AS cycle_start FROM sessions s WHERE s.class_id = ? AND s.status = 'scheduled' AND " + CURRENT_SESSION(), [classId]);
  const students = await getClassStudents(db, classId);
  const marks = await db.all<{ user_id: string; status: ProgressStatus }>("SELECT user_id, status FROM class_progress WHERE class_id = ?", [classId]);
  const byUser = new Map(marks.map((m) => [m.user_id, m.status]));
  return students.map((s) => ({ ...s, status: effectiveStatus(byUser.get(s.user_id) ?? null, cycle?.cycle_start ?? null, now), decided: byUser.has(s.user_id) }));
}

/** Solo la docente de la asignatura decide el resultado de sus estudiantes («automatico» deshace su decisión). */
export async function setClassProgress(db: Db, actor: Actor, classId: string, userId: string, choice: string): Promise<Result> {
  if (!(TEACHER_CHOICES as readonly string[]).includes(choice)) return { ok: false, error: "Elige un estado." };
  if (!isStaff(actor) || !(await isClassTeacher(db, actor.id, classId))) return { ok: false, error: "Solo la docente de esta asignatura puede cambiar el estado de sus estudiantes." };
  const me = await db.get<{ can_grade: number }>("SELECT can_grade FROM users WHERE id = ?", [actor.id]);
  if (!me || me.can_grade !== 1) return { ok: false, error: "Tu cuenta es de suplente: puedes dar la clase y cambiar horarios, pero la nota la pone la docente titular." };
  const students = await getClassStudents(db, classId);
  if (!students.some((s) => s.user_id === userId)) return { ok: false, error: "Esa persona no está inscrita en una certificación que incluya esta asignatura." };
  if (choice === "automatico") {
    await db.run("DELETE FROM class_progress WHERE user_id = ? AND class_id = ?", [userId, classId]);
  } else {
    if (choice === "aprobado" || choice === "no_aprobado") {
      const cyc = await db.get<{ cycle_id: string | null }>(`SELECT s.cycle_id FROM sessions s WHERE s.class_id = ? AND ${CURRENT_SESSION()} AND s.cycle_id IS NOT NULL ORDER BY s.starts_at DESC LIMIT 1`, [classId]);
      await db.run("INSERT INTO class_results (id, user_id, class_id, cycle_id, status, recorded_by, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [newId(), userId, classId, cyc?.cycle_id ?? null, choice, actor.id, nowIso()]);
    }
    const changed = await db.run("UPDATE class_progress SET status = ?, updated_by = ?, updated_at = ? WHERE user_id = ? AND class_id = ?", [choice, actor.id, nowIso(), userId, classId]);
    if (changed.changes === 0) {
      await db.run("INSERT INTO class_progress (user_id, class_id, status, updated_by, updated_at) VALUES (?, ?, ?, ?, ?)", [userId, classId, choice, actor.id, nowIso()]);
    }
  }
  return { ok: true };
}

// ------------------------------------------------------------------ estudiantes de una clase

export interface ClassStudent {
  user_id: string;
  full_name: string;
  program_slug: string;
}

/** Estudiantes con inscripción activa (sin terminar) en alguna certificación que incluye la clase, con su certificación al lado. */
export function getClassStudents(db: Db, classId: string): Promise<ClassStudent[]> {
  return db.all<ClassStudent>(
    `SELECT DISTINCT u.id AS user_id, u.full_name, e.program_slug
     FROM enrollments e JOIN users u ON u.id = e.user_id
     WHERE e.status = 'active' AND e.completed_at IS NULL
       AND e.program_slug IN (SELECT m.program_slug FROM module_classes mc JOIN curriculum_modules m ON m.id = mc.module_id WHERE mc.class_id = ?)
     ORDER BY u.full_name`,
    [classId],
  );
}
