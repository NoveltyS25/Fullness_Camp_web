import { PENSUM_SEED, type SeedClass } from "../data/pensum-seed.ts";
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
const isModality = (m: string): m is Modality => m in MODALITIES;

// ------------------------------------------------------------------ pensum de una certificación

export interface ClassItem {
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

/** Siembra el pensum inicial de un programa la primera vez que se pide (una sola vez). Las clases quedan sin docente. */
export async function ensureSeed(db: Db, programSlug: string): Promise<void> {
  const seed = PENSUM_SEED[programSlug];
  if (!seed) return;
  await db.transaction(async (tx) => {
    if (await tx.get("SELECT 1 AS ok FROM curriculum_seeded WHERE program_slug = ?", [programSlug])) return;
    const now = nowIso();
    for (const [mi, m] of seed.entries()) {
      const moduleId = newId();
      await tx.run("INSERT INTO curriculum_modules (id, program_slug, position, title, created_at) VALUES (?, ?, ?, ?, ?)", [moduleId, programSlug, mi + 1, m.title, now]);
      for (const [ci, topic] of m.topics.entries()) {
        const spec: SeedClass = typeof topic === "string" ? { title: topic } : topic;
        const classId = newId();
        const email = spec.teacherEmail?.toLowerCase() ?? null;
        const teacher = email ? await tx.get<{ id: string }>("SELECT id FROM users WHERE email = ? AND role IN ('teacher', 'admin') AND cedula NOT LIKE 'PEND-%' ORDER BY created_at LIMIT 1", [email]) : undefined;
        const anyTeacher = email && !teacher ? await tx.get<{ id: string }>("SELECT id FROM users WHERE email = ? AND role IN ('teacher', 'admin') ORDER BY created_at LIMIT 1", [email]) : undefined;
        await tx.run("INSERT INTO classes (id, title, teacher_id, modality, suggested_teacher_email, created_at) VALUES (?, ?, ?, 'virtual', ?, ?)", [
          classId, spec.title, teacher?.id ?? anyTeacher?.id ?? null, email, now,
        ]);
        await tx.run("INSERT INTO module_classes (id, module_id, class_id, position) VALUES (?, ?, ?, ?)", [newId(), moduleId, classId, ci + 1]);
        for (const [li, lesson] of (spec.lessons ?? []).entries()) {
          await tx.run("INSERT INTO class_lessons (id, class_id, position, title, topics, created_at) VALUES (?, ?, ?, ?, ?, ?)", [newId(), classId, li + 1, lesson.title, lesson.topics.join("\n"), now]);
        }
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
    `SELECT mc.id AS placement_id, mc.module_id, c.id AS class_id, c.title, c.teacher_id, u.full_name AS teacher_name, c.modality,
            (SELECT COUNT(*) FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled' AND s.ends_at >= ?) AS upcoming_count,
            (SELECT MIN(s.starts_at) FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled' AND s.ends_at >= ?) AS next_start,
            (SELECT s.ends_at FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled' AND s.ends_at >= ? ORDER BY s.starts_at LIMIT 1) AS next_end
     FROM module_classes mc
     JOIN curriculum_modules m ON m.id = mc.module_id
     JOIN classes c ON c.id = mc.class_id
     LEFT JOIN users u ON u.id = c.teacher_id
     WHERE m.program_slug = ? ORDER BY mc.position`,
    [now, now, now, programSlug],
  );
  const lessonsByClass = new Map<string, LessonRow[]>();
  for (const classId of new Set(items.map((i) => i.class_id))) lessonsByClass.set(classId, await getClassLessons(db, classId));
  return modules.map((m) => ({
    ...m,
    classes: items.filter((i) => i.module_id === m.id).map((i) => ({ ...i, upcoming_count: Number(i.upcoming_count), lessons: lessonsByClass.get(i.class_id) ?? [] })),
  }));
}

/** Temario de una clase, cada encuentro con su horario (si ya tiene). */
export async function getClassLessons(db: Db, classId: string): Promise<LessonRow[]> {
  const rows = await db.all<{ id: string; title: string; topics: string; starts_at: string | null; ends_at: string | null; session_id: string | null; status: "scheduled" | "cancelled" | null }>(
    `SELECT l.id, l.title, l.topics, s.starts_at, s.ends_at, s.id AS session_id, s.status
     FROM class_lessons l LEFT JOIN sessions s ON s.lesson_id = l.id
     WHERE l.class_id = ? ORDER BY l.position`,
    [classId],
  );
  return rows.map((r) => ({ ...r, topics: r.topics ? r.topics.split("\n").filter(Boolean) : [] }));
}

/** Programas que ya tienen pensum (o tienen uno inicial por sembrar). */
export async function programsWithPensum(db: Db): Promise<Set<string>> {
  for (const slug of Object.keys(PENSUM_SEED)) await ensureSeed(db, slug);
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
    `SELECT c.teacher_id AS user_id, u.full_name, c.title AS class_title
     FROM module_classes mc JOIN curriculum_modules m ON m.id = mc.module_id
     JOIN classes c ON c.id = mc.class_id JOIN users u ON u.id = c.teacher_id
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
  upcoming_count: number;
  /** Certificaciones (program_slug) donde está la clase. */
  programs: string[];
}

const CLASS_SELECT = `SELECT c.id, c.title, c.teacher_id, u.full_name AS teacher_name, c.modality, c.description,
  (SELECT COUNT(*) FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled' AND s.ends_at >= ?) AS upcoming_count
  FROM classes c LEFT JOIN users u ON u.id = c.teacher_id`;

async function withPrograms(db: Db, rows: Omit<ClassRow, "programs">[]): Promise<ClassRow[]> {
  const out: ClassRow[] = [];
  for (const r of rows) {
    const p = await db.all<{ program_slug: string }>(
      "SELECT DISTINCT m.program_slug FROM module_classes mc JOIN curriculum_modules m ON m.id = mc.module_id WHERE mc.class_id = ? ORDER BY m.program_slug",
      [r.id],
    );
    out.push({ ...r, upcoming_count: Number(r.upcoming_count), programs: p.map((x) => x.program_slug) });
  }
  return out;
}

export async function listClasses(db: Db): Promise<ClassRow[]> {
  return withPrograms(db, await db.all<Omit<ClassRow, "programs">>(`${CLASS_SELECT} ORDER BY c.title`, [nowIso()]));
}

export async function getTeacherClasses(db: Db, teacherId: string): Promise<ClassRow[]> {
  return withPrograms(db, await db.all<Omit<ClassRow, "programs">>(`${CLASS_SELECT} WHERE c.teacher_id = ? ORDER BY c.title`, [nowIso(), teacherId]));
}

export async function getClass(db: Db, classId: string): Promise<ClassRow | undefined> {
  const rows = await withPrograms(db, await db.all<Omit<ClassRow, "programs">>(`${CLASS_SELECT} WHERE c.id = ?`, [nowIso(), classId]));
  return rows[0];
}

/** Una docente solo ve y edita sus clases; la administración, todas. */
export async function getClassForActor(db: Db, actor: Actor, classId: string): Promise<ClassRow | undefined> {
  const c = await getClass(db, classId);
  if (!c) return undefined;
  return actor.role === "admin" || c.teacher_id === actor.id ? c : undefined;
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

  return db.transaction(async (tx) => {
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
    if (!sessions.ok) throw new Error(sessions.error);
    return created;
  });
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

/** Crea un encuentro o lo repite cada semana. Colombia no cambia de hora, así que +7 días exactos mantiene la hora. */
export async function addClassSessions(db: Db, actor: Actor, s: AddSessionsInput): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const c = await getClassForActor(db, actor, s.classId);
  if (!c) return { ok: false, error: "No tienes permiso para cambiar los horarios de esta clase." };
  if (new Date(s.endsAt) <= new Date(s.startsAt)) return { ok: false, error: "La hora de fin debe ser después de la de inicio." };
  const weeks = Math.min(40, Math.max(1, Math.trunc(s.weeks) || 1));
  const title = s.title.trim().slice(0, 160) || c.title;
  await db.transaction(async (tx) => {
    for (let i = 0; i < weeks; i++) {
      await tx.run("INSERT INTO sessions (id, class_id, title, starts_at, ends_at, location, online_url, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)", [
        newId(), s.classId, weeks > 1 ? `${title} (${i + 1}/${weeks})` : title,
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
  if (await db.get("SELECT 1 AS ok FROM sessions WHERE lesson_id = ?", [i.lessonId])) return { ok: false, error: "Esta clase ya tiene horario. Para moverla usa «Cambiar horario»: así se avisa a las estudiantes." };

  await db.run("INSERT INTO sessions (id, class_id, lesson_id, title, starts_at, ends_at, location, online_url, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)", [
    newId(), c.id, i.lessonId, l.title, i.startsAt, i.endsAt, needsPlace ? i.location.trim() : null, needsLink ? i.onlineUrl.trim() : null, nowIso(),
  ]);
  return { ok: true };
}

/** Asigna a esta docente las clases que la administración dejó previstas para su correo. */
export async function claimSuggestedClasses(db: Db, userId: string, email: string): Promise<number> {
  const r = await db.run("UPDATE classes SET teacher_id = ? WHERE teacher_id IS NULL AND suggested_teacher_email = ?", [userId, email.toLowerCase()]);
  return r.changes;
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
    `SELECT m.id AS module_id, m.title AS module_title, c.id AS class_id, c.title, u.full_name AS teacher_name, p.status AS explicit,
            (SELECT MIN(s.starts_at) FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled') AS cycle_start,
            (SELECT MAX(s.ends_at) FROM sessions s WHERE s.class_id = c.id AND s.status = 'scheduled') AS cycle_end
     FROM curriculum_modules m
     JOIN module_classes mc ON mc.module_id = m.id
     JOIN classes c ON c.id = mc.class_id
     LEFT JOIN users u ON u.id = c.teacher_id
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
    mod.classes.push({ class_id: r.class_id, title: r.title, teacher_name: r.teacher_name, status, decided: r.explicit !== null, cycle_start: r.cycle_start, cycle_end: r.cycle_end });
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
  const cycle = await db.get<{ cycle_start: string | null }>("SELECT MIN(starts_at) AS cycle_start FROM sessions WHERE class_id = ? AND status = 'scheduled'", [classId]);
  const students = await getClassStudents(db, classId);
  const marks = await db.all<{ user_id: string; status: ProgressStatus }>("SELECT user_id, status FROM class_progress WHERE class_id = ?", [classId]);
  const byUser = new Map(marks.map((m) => [m.user_id, m.status]));
  return students.map((s) => ({ ...s, status: effectiveStatus(byUser.get(s.user_id) ?? null, cycle?.cycle_start ?? null, now), decided: byUser.has(s.user_id) }));
}

/** Solo la docente de la asignatura decide el resultado de sus estudiantes («automatico» deshace su decisión). */
export async function setClassProgress(db: Db, actor: Actor, classId: string, userId: string, choice: string): Promise<Result> {
  if (!(TEACHER_CHOICES as readonly string[]).includes(choice)) return { ok: false, error: "Elige un estado." };
  const c = await db.get<{ teacher_id: string | null }>("SELECT teacher_id FROM classes WHERE id = ?", [classId]);
  if (!c || !isStaff(actor) || c.teacher_id !== actor.id) return { ok: false, error: "Solo la docente de esta asignatura puede cambiar el estado de sus estudiantes." };
  const students = await getClassStudents(db, classId);
  if (!students.some((s) => s.user_id === userId)) return { ok: false, error: "Esa persona no está inscrita en una certificación que incluya esta asignatura." };
  if (choice === "automatico") {
    await db.run("DELETE FROM class_progress WHERE user_id = ? AND class_id = ?", [userId, classId]);
  } else {
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
