import { randomInt } from "node:crypto";
import { PENSUM_SEED } from "../data/pensum-seed.ts";
import { newId, nowIso, type Db } from "./db/index.ts";
import type { User } from "./users.ts";

export type Modality = "presencial" | "virtual" | "mixta";
export const MODALITIES: Record<Modality, string> = { presencial: "Presencial", virtual: "Virtual", mixta: "Presencial y virtual" };

type Actor = Pick<User, "id" | "role">;
export type Result = { ok: true } | { ok: false; error: string };

// ------------------------------------------------------------------ lectura

export interface TopicTeacher {
  user_id: string;
  full_name: string;
  modality: Modality;
  classes_count: number | null;
  schedule_note: string | null;
}

export interface PensumTopic {
  id: string;
  title: string;
  created_by: string | null;
  teachers: TopicTeacher[];
}

export interface PensumModule {
  id: string;
  title: string;
  topics: PensumTopic[];
}

/** Siembra el pensum inicial de un programa la primera vez que se pide (una sola vez). */
export async function ensureSeed(db: Db, programSlug: string): Promise<void> {
  const seed = PENSUM_SEED[programSlug];
  if (!seed) return;
  await db.transaction(async (tx) => {
    if (await tx.get("SELECT 1 AS ok FROM curriculum_seeded WHERE program_slug = ?", [programSlug])) return;
    const now = nowIso();
    for (const [mi, m] of seed.entries()) {
      const moduleId = newId();
      await tx.run("INSERT INTO curriculum_modules (id, program_slug, position, title, created_at) VALUES (?, ?, ?, ?, ?)", [moduleId, programSlug, mi + 1, m.title, now]);
      for (const [ti, title] of m.topics.entries()) {
        await tx.run("INSERT INTO curriculum_topics (id, module_id, position, title, created_by, created_at) VALUES (?, ?, ?, ?, NULL, ?)", [newId(), moduleId, ti + 1, title, now]);
      }
    }
    await tx.run("INSERT INTO curriculum_seeded (program_slug) VALUES (?)", [programSlug]);
  });
}

export async function getPensum(db: Db, programSlug: string): Promise<PensumModule[]> {
  await ensureSeed(db, programSlug);
  const modules = await db.all<{ id: string; title: string }>("SELECT id, title FROM curriculum_modules WHERE program_slug = ? ORDER BY position", [programSlug]);
  const topics = await db.all<{ id: string; module_id: string; title: string; created_by: string | null }>(
    `SELECT t.id, t.module_id, t.title, t.created_by FROM curriculum_topics t
     JOIN curriculum_modules m ON m.id = t.module_id WHERE m.program_slug = ? ORDER BY t.position`,
    [programSlug],
  );
  const teachers = await db.all<TopicTeacher & { topic_id: string }>(
    `SELECT tt.topic_id, tt.user_id, u.full_name, tt.modality, tt.classes_count, tt.schedule_note
     FROM topic_teachers tt JOIN users u ON u.id = tt.user_id
     JOIN curriculum_topics t ON t.id = tt.topic_id JOIN curriculum_modules m ON m.id = t.module_id
     WHERE m.program_slug = ? ORDER BY u.full_name`,
    [programSlug],
  );
  return modules.map((m) => ({
    ...m,
    topics: topics
      .filter((t) => t.module_id === m.id)
      .map((t) => ({ id: t.id, title: t.title, created_by: t.created_by, teachers: teachers.filter((x) => x.topic_id === t.id) })),
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
  topics: string[];
}

/** Docentes que dictan al menos un tema del programa, con su perfil y los temas que dictan. */
export async function getProgramTeachers(db: Db, programSlug: string): Promise<TeacherCard[]> {
  const rows = await db.all<{ user_id: string; full_name: string; topic_title: string }>(
    `SELECT tt.user_id, u.full_name, t.title AS topic_title
     FROM topic_teachers tt JOIN users u ON u.id = tt.user_id
     JOIN curriculum_topics t ON t.id = tt.topic_id JOIN curriculum_modules m ON m.id = t.module_id
     WHERE m.program_slug = ? ORDER BY u.full_name, m.position, t.position`,
    [programSlug],
  );
  const cards = new Map<string, TeacherCard>();
  for (const r of rows) {
    const c = cards.get(r.user_id) ?? { user_id: r.user_id, full_name: r.full_name, headline: null, bio: null, contact_email: null, contact_phone: null, photo_url: null, topics: [] };
    c.topics.push(r.topic_title);
    cards.set(r.user_id, c);
  }
  for (const c of cards.values()) {
    const p = await db.get<Omit<TeacherCard, "user_id" | "full_name" | "topics">>("SELECT headline, bio, contact_email, contact_phone, photo_url FROM teacher_profiles WHERE user_id = ?", [c.user_id]);
    if (p) Object.assign(c, p);
  }
  return [...cards.values()];
}

export function listTeachers(db: Db): Promise<{ id: string; full_name: string }[]> {
  return db.all("SELECT id, full_name FROM users WHERE role IN ('teacher', 'admin') ORDER BY full_name");
}

// ------------------------------------------------------------------ edición (docentes y administración)

const isStaff = (a: Actor) => a.role === "teacher" || a.role === "admin";

export async function addModule(db: Db, actor: Actor, programSlug: string, title: string): Promise<Result> {
  if (actor.role !== "admin") return { ok: false, error: "Solo la administración agrega módulos." };
  const clean = title.trim().slice(0, 140);
  if (clean.length < 2) return { ok: false, error: "Escribe el nombre del módulo." };
  const last = await db.get<{ p: number | null }>("SELECT MAX(position) AS p FROM curriculum_modules WHERE program_slug = ?", [programSlug]);
  await db.run("INSERT INTO curriculum_modules (id, program_slug, position, title, created_at) VALUES (?, ?, ?, ?, ?)", [newId(), programSlug, Number(last?.p ?? 0) + 1, clean, nowIso()]);
  return { ok: true };
}

export async function deleteModule(db: Db, actor: Actor, moduleId: string): Promise<Result> {
  if (actor.role !== "admin") return { ok: false, error: "Solo la administración quita módulos." };
  await db.run("DELETE FROM curriculum_modules WHERE id = ?", [moduleId]);
  return { ok: true };
}

export async function addTopic(db: Db, actor: Actor, moduleId: string, title: string): Promise<Result> {
  if (!isStaff(actor)) return { ok: false, error: "No tienes permiso." };
  const clean = title.trim().slice(0, 200);
  if (clean.length < 2) return { ok: false, error: "Escribe el nombre del tema." };
  if (!(await db.get("SELECT 1 AS ok FROM curriculum_modules WHERE id = ?", [moduleId]))) return { ok: false, error: "No encontramos ese módulo." };
  const last = await db.get<{ p: number | null }>("SELECT MAX(position) AS p FROM curriculum_topics WHERE module_id = ?", [moduleId]);
  await db.run("INSERT INTO curriculum_topics (id, module_id, position, title, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)", [newId(), moduleId, Number(last?.p ?? 0) + 1, clean, actor.id, nowIso()]);
  return { ok: true };
}

/**
 * Quitar un tema: la administración siempre. Una docente solo si lo creó ella o si ella es la única persona asignada,
 * para que nadie borre por error lo que dicta otra docente.
 */
export async function deleteTopic(db: Db, actor: Actor, topicId: string): Promise<Result> {
  if (!isStaff(actor)) return { ok: false, error: "No tienes permiso." };
  const t = await db.get<{ created_by: string | null }>("SELECT created_by FROM curriculum_topics WHERE id = ?", [topicId]);
  if (!t) return { ok: false, error: "No encontramos ese tema." };
  if (actor.role !== "admin") {
    const others = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM topic_teachers WHERE topic_id = ? AND user_id <> ?", [topicId, actor.id]);
    if (Number(others?.n ?? 0) > 0) return { ok: false, error: "Otra docente dicta este tema. Pídele a la administración que lo quite." };
    const mine = t.created_by === actor.id || (await db.get("SELECT 1 AS ok FROM topic_teachers WHERE topic_id = ? AND user_id = ?", [topicId, actor.id]));
    if (!mine) return { ok: false, error: "Solo puedes quitar temas que creaste o que dictas tú." };
  }
  await db.run("DELETE FROM curriculum_topics WHERE id = ?", [topicId]);
  return { ok: true };
}

export interface AssignInput {
  topicId: string;
  userId: string;
  modality: string;
  classesCount: string;
  scheduleNote: string;
}

/** Una docente se asigna a sí misma; la administración puede asignar a cualquier docente. También sirve para editar la asignación. */
export async function assignTopic(db: Db, actor: Actor, i: AssignInput): Promise<Result> {
  if (!isStaff(actor)) return { ok: false, error: "No tienes permiso." };
  if (actor.role !== "admin" && i.userId !== actor.id) return { ok: false, error: "Solo puedes asignarte temas a ti misma." };
  if (!(i.modality in MODALITIES)) return { ok: false, error: "Elige si es presencial, virtual o mixta." };
  const count = i.classesCount.trim() === "" ? null : Number(i.classesCount);
  if (count !== null && (!Number.isInteger(count) || count < 1 || count > 200)) return { ok: false, error: "El número de clases debe ser un entero entre 1 y 200." };
  const teacher = await db.get<{ role: string }>("SELECT role FROM users WHERE id = ?", [i.userId]);
  if (!teacher || (teacher.role !== "teacher" && teacher.role !== "admin")) return { ok: false, error: "Esa persona no es docente." };
  if (!(await db.get("SELECT 1 AS ok FROM curriculum_topics WHERE id = ?", [i.topicId]))) return { ok: false, error: "No encontramos ese tema." };

  const note = i.scheduleNote.trim().slice(0, 400) || null;
  const changed = await db.run("UPDATE topic_teachers SET modality = ?, classes_count = ?, schedule_note = ?, updated_at = ? WHERE topic_id = ? AND user_id = ?", [i.modality, count, note, nowIso(), i.topicId, i.userId]);
  if (changed.changes === 0) {
    await db.run("INSERT INTO topic_teachers (topic_id, user_id, modality, classes_count, schedule_note, updated_at) VALUES (?, ?, ?, ?, ?, ?)", [i.topicId, i.userId, i.modality, count, note, nowIso()]);
  }
  return { ok: true };
}

export async function unassignTopic(db: Db, actor: Actor, topicId: string, userId: string): Promise<Result> {
  if (!isStaff(actor)) return { ok: false, error: "No tienes permiso." };
  if (actor.role !== "admin" && userId !== actor.id) return { ok: false, error: "Solo puedes quitarte tus propios temas." };
  await db.run("DELETE FROM topic_teachers WHERE topic_id = ? AND user_id = ?", [topicId, userId]);
  return { ok: true };
}

// ------------------------------------------------------------------ perfil de la docente

export interface TeacherProfile {
  headline: string | null;
  bio: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  photo_url: string | null;
}

export async function getTeacherProfile(db: Db, userId: string): Promise<TeacherProfile | undefined> {
  const row = await db.get<TeacherProfile>("SELECT headline, bio, contact_email, contact_phone, photo_url FROM teacher_profiles WHERE user_id = ?", [userId]);
  // Objeto normal (node:sqlite devuelve objetos sin prototipo, que React no deja pasar a componentes de cliente).
  return row ? { ...row } : undefined;
}

export async function saveTeacherProfile(db: Db, userId: string, p: TeacherProfile): Promise<void> {
  const changed = await db.run(
    "UPDATE teacher_profiles SET headline = ?, bio = ?, contact_email = ?, contact_phone = ?, photo_url = ?, updated_at = ? WHERE user_id = ?",
    [p.headline, p.bio, p.contact_email, p.contact_phone, p.photo_url, nowIso(), userId],
  );
  if (changed.changes === 0) {
    await db.run(
      "INSERT INTO teacher_profiles (user_id, headline, bio, contact_email, contact_phone, photo_url, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, p.headline, p.bio, p.contact_email, p.contact_phone, p.photo_url, nowIso()],
    );
  }
}

// ------------------------------------------------------------------ cursos terminados y certificado

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function certificateCode(): string {
  let tail = "";
  for (let i = 0; i < 8; i++) tail += ALPHABET[randomInt(ALPHABET.length)];
  return `FC-${tail}`;
}

/** La administración marca un curso como terminado. Genera el código del certificado. Se puede deshacer. */
export async function setCourseCompleted(db: Db, actor: Actor, enrollmentId: string, completed: boolean): Promise<Result> {
  if (actor.role !== "admin") return { ok: false, error: "Solo la administración marca un curso como terminado." };
  const e = await db.get<{ certificate_code: string | null }>("SELECT certificate_code FROM enrollments WHERE id = ?", [enrollmentId]);
  if (!e) return { ok: false, error: "No encontramos esa inscripción." };
  if (completed) {
    await db.run("UPDATE enrollments SET completed_at = ?, certificate_code = ? WHERE id = ?", [nowIso(), e.certificate_code ?? certificateCode(), enrollmentId]);
  } else {
    await db.run("UPDATE enrollments SET completed_at = NULL WHERE id = ?", [enrollmentId]);
  }
  return { ok: true };
}

export interface CertificateData {
  enrollment_id: string;
  program_slug: string;
  full_name: string;
  cedula: string;
  completed_at: string;
  certificate_code: string;
}

/** Solo la dueña del certificado o la administración pueden verlo. */
export async function getCertificate(db: Db, actor: Actor, enrollmentId: string): Promise<CertificateData | undefined> {
  const row = await db.get<CertificateData & { user_id: string }>(
    `SELECT e.id AS enrollment_id, e.program_slug, e.user_id, u.full_name, u.cedula, e.completed_at, e.certificate_code
     FROM enrollments e JOIN users u ON u.id = e.user_id
     WHERE e.id = ? AND e.completed_at IS NOT NULL AND e.certificate_code IS NOT NULL AND e.status = 'active'`,
    [enrollmentId],
  );
  if (!row) return undefined;
  if (actor.role !== "admin" && row.user_id !== actor.id) return undefined;
  return row;
}
