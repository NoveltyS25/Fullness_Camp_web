import { randomInt } from "node:crypto";
import { nowIso, type Db } from "./db/index.ts";
import type { Actor, Result } from "./classes.ts";

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
