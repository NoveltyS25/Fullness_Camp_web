import { PENSUM_SEED } from "../data/pensum-seed.ts";
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
      for (const [ci, title] of m.topics.entries()) {
        const classId = newId();
        await tx.run("INSERT INTO classes (id, title, teacher_id, modality, created_at) VALUES (?, ?, NULL, 'virtual', ?)", [classId, title, now]);
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
  return modules.map((m) => ({
    ...m,
    classes: items.filter((i) => i.module_id === m.id).map((i) => ({ ...i, upcoming_count: Number(i.upcoming_count) })),
  }));
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
