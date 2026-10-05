import { emailContent, greeting, whatsappSummary, type ChangeContext, type SessionData } from "../lib/campus/messages.ts";
import { newId, nowIso, type Db } from "./db/index.ts";
import { sendEmail, sendWhatsapp } from "./outbox.ts";
import { createSetupLink } from "./auth.ts";
import { generateTempPassword, hashPassword } from "./security.ts";
import { manualAccountEmail } from "./templates.ts";
import { findUserByCedula, type Role, type User } from "./users.ts";

// ------------------------------------------------------------------ lo que ve la estudiante

export interface Entitlement {
  enrollment_id: string;
  program_slug: string;
  status: string;
  cohort_id: string | null;
  cohort_name: string | null;
  sede: string | null;
  teacher_name: string | null;
}

/** Programas a los que la persona tiene acceso AHORA (inscripción activa, creada por un pago o por una administradora). */
export function getEntitlements(db: Db, userId: string): Promise<Entitlement[]> {
  return db.all<Entitlement>(
    `SELECT e.id AS enrollment_id, e.program_slug, e.status, e.cohort_id,
            c.name AS cohort_name, c.sede, t.full_name AS teacher_name
     FROM enrollments e
     LEFT JOIN cohorts c ON c.id = e.cohort_id
     LEFT JOIN users t ON t.id = c.teacher_id
     WHERE e.user_id = ? AND e.status = 'active'
     ORDER BY e.created_at`,
    [userId],
  );
}

/** ¿Puede ver el contenido del campus? Estudiantes: solo con una inscripción activa. Profesoras y administradoras: siempre. */
export function canAccessCampus(user: Pick<User, "role">, entitlements: Entitlement[]): boolean {
  return user.role !== "student" || entitlements.length > 0;
}

export function countPendingOrders(db: Db, cedula: string): Promise<{ n: number } | undefined> {
  return db.get<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE buyer_cedula = ? AND status = 'pending'", [cedula]);
}

export interface SessionRow {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  online_url: string | null;
  status: "scheduled" | "cancelled";
  cohort_name: string;
  sede: string;
}

const SESSION_SELECT = `SELECT s.id, s.title, s.starts_at, s.ends_at, s.location, s.online_url, s.status, c.name AS cohort_name, c.sede
  FROM sessions s JOIN cohorts c ON c.id = s.cohort_id`;

export function getStudentSessions(db: Db, userId: string): Promise<SessionRow[]> {
  return db.all<SessionRow>(
    `${SESSION_SELECT}
     WHERE s.ends_at >= ? AND s.cohort_id IN (SELECT cohort_id FROM enrollments WHERE user_id = ? AND status = 'active' AND cohort_id IS NOT NULL)
     ORDER BY s.starts_at LIMIT 80`,
    [nowIso(), userId],
  );
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export function getNotifications(db: Db, userId: string): Promise<Notice[]> {
  return db.all<Notice>("SELECT id, title, body, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [userId]);
}

export async function unreadCount(db: Db, userId: string): Promise<number> {
  const r = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL", [userId]);
  return Number(r?.n ?? 0);
}

export async function markAllRead(db: Db, userId: string): Promise<void> {
  await db.run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", [nowIso(), userId]);
}

export async function updateProfile(
  db: Db,
  userId: string,
  p: { fullName: string; phone: string | null; notifyEmail: boolean; notifyWhatsapp: boolean },
): Promise<void> {
  await db.run("UPDATE users SET full_name = ?, whatsapp_phone = ?, notify_email = ?, notify_whatsapp = ? WHERE id = ?", [
    p.fullName,
    p.phone,
    p.notifyEmail ? 1 : 0,
    p.notifyWhatsapp ? 1 : 0,
    userId,
  ]);
}

// ------------------------------------------------------------------ profesoras

export function getTeacherSessions(db: Db, actor: Pick<User, "id" | "role">): Promise<SessionRow[]> {
  if (actor.role === "admin") {
    return db.all<SessionRow>(`${SESSION_SELECT} WHERE s.ends_at >= ? ORDER BY s.starts_at LIMIT 100`, [nowIso()]);
  }
  return db.all<SessionRow>(`${SESSION_SELECT} WHERE s.ends_at >= ? AND c.teacher_id = ? ORDER BY s.starts_at LIMIT 100`, [nowIso(), actor.id]);
}

export interface EditableSession extends SessionRow {
  cohort_id: string;
  teacher_id: string | null;
}

export async function getSessionForActor(db: Db, actor: Pick<User, "id" | "role">, sessionId: string): Promise<EditableSession | undefined> {
  const row = await db.get<EditableSession>(
    `SELECT s.id, s.title, s.starts_at, s.ends_at, s.location, s.online_url, s.status, s.cohort_id, c.name AS cohort_name, c.sede, c.teacher_id
     FROM sessions s JOIN cohorts c ON c.id = s.cohort_id WHERE s.id = ?`,
    [sessionId],
  );
  if (!row) return undefined;
  return actor.role === "admin" || row.teacher_id === actor.id ? row : undefined;
}

export async function countActiveEnrollees(db: Db, cohortId: string): Promise<number> {
  const r = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM enrollments WHERE cohort_id = ? AND status = 'active'", [cohortId]);
  return Number(r?.n ?? 0);
}

export interface RescheduleInput {
  sessionId: string;
  startsAt: string; // ISO UTC
  endsAt: string;
  location: string | null;
  onlineUrl: string | null;
  status: "scheduled" | "cancelled";
  reason: string;
}

export type RescheduleResult = { ok: true; notified: number } | { ok: false; error: string };

/**
 * Cambia el horario de una clase y avisa a las estudiantes, todo en una sola transacción: o queda todo
 * (clase, historial, avisos en la plataforma y cola de correo/WhatsApp) o no queda nada.
 */
export async function rescheduleSession(db: Db, actor: Pick<User, "id" | "role">, input: RescheduleInput): Promise<RescheduleResult> {
  if (actor.role !== "teacher" && actor.role !== "admin") return { ok: false, error: "No tienes permiso para cambiar horarios." };
  if (new Date(input.endsAt) <= new Date(input.startsAt)) return { ok: false, error: "La hora de fin debe ser después de la de inicio." };
  const reason = input.reason.trim();
  if (reason.length < 3) return { ok: false, error: "Cuéntale a tus estudiantes el motivo del cambio." };

  return db.transaction(async (tx): Promise<RescheduleResult> => {
    const s = await getSessionForActor(tx, actor, input.sessionId);
    if (!s) return { ok: false, error: "No tienes permiso para cambiar esta clase." };

    const location = input.location?.trim() || null;
    const onlineUrl = input.onlineUrl?.trim() || null;
    if (
      new Date(s.starts_at).getTime() === new Date(input.startsAt).getTime() &&
      new Date(s.ends_at).getTime() === new Date(input.endsAt).getTime() &&
      s.location === location && s.online_url === onlineUrl && s.status === input.status
    ) {
      return { ok: true, notified: 0 }; // sin cambios reales no se molesta a nadie
    }

    const oldData: SessionData = { starts_at: s.starts_at, ends_at: s.ends_at, location: s.location, online_url: s.online_url, status: s.status };
    const newData: SessionData = { starts_at: new Date(input.startsAt).toISOString(), ends_at: new Date(input.endsAt).toISOString(), location, online_url: onlineUrl, status: input.status };

    const changeId = newId();
    await tx.run("INSERT INTO session_changes (id, session_id, changed_by, old_data, new_data, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
      changeId, s.id, actor.id, JSON.stringify(oldData), JSON.stringify(newData), reason, nowIso(),
    ]);
    await tx.run("UPDATE sessions SET starts_at = ?, ends_at = ?, location = ?, online_url = ?, status = ?, updated_at = ? WHERE id = ?", [
      newData.starts_at, newData.ends_at, location, onlineUrl, input.status, nowIso(), s.id,
    ]);

    const { title, body } = describeChange(s.title, newData, reason);
    const students = await tx.all<{ id: string; email: string; whatsapp_phone: string | null; notify_email: number; notify_whatsapp: number }>(
      `SELECT u.id, u.email, u.whatsapp_phone, u.notify_email, u.notify_whatsapp
       FROM enrollments e JOIN users u ON u.id = e.user_id WHERE e.cohort_id = ? AND e.status = 'active'`,
      [s.cohort_id],
    );
    for (const st of students) {
      const notificationId = newId();
      await tx.run("INSERT INTO notifications (id, user_id, session_id, change_id, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
        notificationId, st.id, s.id, changeId, title, body, nowIso(),
      ]);
      if (st.notify_email && st.email) {
        await tx.run("INSERT INTO deliveries (id, notification_id, channel, created_at) VALUES (?, ?, 'email', ?)", [newId(), notificationId, nowIso()]);
      }
      if (st.notify_whatsapp && st.whatsapp_phone) {
        await tx.run("INSERT INTO deliveries (id, notification_id, channel, created_at) VALUES (?, ?, 'whatsapp', ?)", [newId(), notificationId, nowIso()]);
      }
    }
    return { ok: true, notified: students.length };
  });
}

const bogota = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", ...opts }).format(d);

function describeChange(sessionTitle: string, d: SessionData, reason: string): { title: string; body: string } {
  if (d.status === "cancelled") {
    return { title: `Clase cancelada: ${sessionTitle}`, body: `Se canceló la clase "${sessionTitle}". Motivo: ${reason}` };
  }
  const start = new Date(d.starts_at);
  const day = bogota(start, { weekday: "long", day: "numeric", month: "long" });
  const range = `${bogota(start, { hour: "numeric", minute: "2-digit", hour12: true })} a ${bogota(new Date(d.ends_at), { hour: "numeric", minute: "2-digit", hour12: true })}`;
  return { title: `Cambio de horario: ${sessionTitle}`, body: `La clase "${sessionTitle}" ahora es el ${day}, de ${range} (hora de Colombia). Motivo: ${reason}` };
}

// ------------------------------------------------------------------ envío de avisos

interface DeliveryRow {
  id: string;
  channel: "email" | "whatsapp";
  attempts: number;
  full_name: string;
  email: string;
  whatsapp_phone: string | null;
  title: string;
  old_data: string;
  new_data: string;
  reason: string;
}

const MAX_ATTEMPTS = 3;

/**
 * Envía los correos y WhatsApp pendientes de los cambios de horario. Cada envío se "reclama" antes de
 * mandarse, así que llamarla dos veces a la vez no duplica avisos. Sin credenciales de Resend o Meta
 * quedan registrados ("logged") en la bandeja de demostración.
 */
export async function processPendingDeliveries(db: Db, baseUrl: string, limit = 25): Promise<{ sent: number; failed: number }> {
  const result = { sent: 0, failed: 0 };
  const stuck = new Date(Date.now() - 15 * 60_000).toISOString();
  await db.run("UPDATE deliveries SET status = 'pending', claimed_at = NULL WHERE status = 'sending' AND claimed_at < ?", [stuck]);

  const candidates = await db.all<{ id: string }>("SELECT id FROM deliveries WHERE status = 'pending' ORDER BY created_at LIMIT ?", [limit]);
  for (const { id } of candidates) {
    const claimed = await db.run("UPDATE deliveries SET status = 'sending', claimed_at = ? WHERE id = ? AND status = 'pending'", [nowIso(), id]);
    if (claimed.changes !== 1) continue; // otro proceso la tomó primero

    const row = await db.get<DeliveryRow>(
      `SELECT d.id, d.channel, d.attempts, u.full_name, u.email, u.whatsapp_phone, st.title, c.old_data, c.new_data, c.reason
       FROM deliveries d
       JOIN notifications n ON n.id = d.notification_id
       JOIN users u ON u.id = n.user_id
       JOIN sessions st ON st.id = n.session_id
       JOIN session_changes c ON c.id = n.change_id
       WHERE d.id = ?`,
      [id],
    );
    if (!row) {
      await db.run("UPDATE deliveries SET status = 'skipped', last_error = 'Faltan datos del aviso' WHERE id = ?", [id]);
      continue;
    }

    const ctx: ChangeContext = {
      studentName: row.full_name,
      sessionTitle: row.title,
      oldData: JSON.parse(row.old_data) as SessionData,
      newData: JSON.parse(row.new_data) as SessionData,
      reason: row.reason,
      campusUrl: `${baseUrl}/campus`,
    };

    const outcome =
      row.channel === "email"
        ? await sendEmail(db, { to: row.email, ...emailContent(ctx) })
        : row.whatsapp_phone
          ? await sendWhatsapp(db, { to: row.whatsapp_phone, params: [greeting(row.full_name).replace(/^Hola\s?/, "") || "estudiante", `"${ctx.sessionTitle}"`, whatsappSummary(ctx)] })
          : { status: "failed" as const, error: "Sin número de WhatsApp" };

    if (outcome.status === "failed") {
      const attempts = row.attempts + 1;
      const giveUp = attempts >= MAX_ATTEMPTS;
      if (giveUp) result.failed++;
      await db.run("UPDATE deliveries SET status = ?, attempts = ?, last_error = ?, claimed_at = NULL WHERE id = ?", [giveUp ? "failed" : "pending", attempts, outcome.error ?? null, id]);
    } else {
      result.sent++;
      await db.run("UPDATE deliveries SET status = ?, sent_at = ?, last_error = NULL WHERE id = ?", [outcome.status, nowIso(), id]);
    }
  }
  return result;
}

// ------------------------------------------------------------------ administración

export interface CohortRow {
  id: string;
  program_slug: string;
  name: string;
  sede: string;
  starts_on: string | null;
  active: number;
  teacher_name: string | null;
  teacher_id: string | null;
}

export function listCohorts(db: Db): Promise<CohortRow[]> {
  return db.all<CohortRow>(
    `SELECT c.id, c.program_slug, c.name, c.sede, c.starts_on, c.active, c.teacher_id, t.full_name AS teacher_name
     FROM cohorts c LEFT JOIN users t ON t.id = c.teacher_id ORDER BY c.created_at DESC`,
  );
}

export function getCohort(db: Db, id: string): Promise<CohortRow | undefined> {
  return db.get<CohortRow>(
    `SELECT c.id, c.program_slug, c.name, c.sede, c.starts_on, c.active, c.teacher_id, t.full_name AS teacher_name
     FROM cohorts c LEFT JOIN users t ON t.id = c.teacher_id WHERE c.id = ?`,
    [id],
  );
}

export function listStaff(db: Db) {
  return db.all<{ id: string; cedula: string; full_name: string; email: string; role: Role }>(
    "SELECT id, cedula, full_name, email, role FROM users WHERE role IN ('teacher', 'admin') ORDER BY full_name",
  );
}

export async function createCohort(
  db: Db,
  c: { programSlug: string; name: string; sede: string; teacherId: string | null; startsOn: string | null },
): Promise<string> {
  const id = newId();
  await db.run("INSERT INTO cohorts (id, program_slug, name, sede, teacher_id, starts_on, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)", [
    id, c.programSlug, c.name, c.sede, c.teacherId, c.startsOn, nowIso(),
  ]);
  return id;
}

export async function setCohortActive(db: Db, id: string, active: boolean): Promise<void> {
  await db.run("UPDATE cohorts SET active = ? WHERE id = ?", [active ? 1 : 0, id]);
}

export function listCohortSessions(db: Db, cohortId: string): Promise<SessionRow[]> {
  return db.all<SessionRow>(`${SESSION_SELECT} WHERE s.cohort_id = ? ORDER BY s.starts_at`, [cohortId]);
}

export function listCohortEnrollments(db: Db, cohortId: string) {
  return db.all<{ user_id: string; status: "active" | "paused" | "cancelled"; full_name: string; cedula: string; email: string; whatsapp_phone: string | null }>(
    `SELECT e.user_id, e.status, u.full_name, u.cedula, u.email, u.whatsapp_phone
     FROM enrollments e JOIN users u ON u.id = e.user_id WHERE e.cohort_id = ? ORDER BY u.full_name`,
    [cohortId],
  );
}

/** Crea una clase o la repite semanalmente. Colombia no cambia de hora, así que +7 días exactos mantiene la hora. */
export async function addSessions(
  db: Db,
  s: { cohortId: string; title: string; startsAt: string; endsAt: string; weeks: number; location: string | null; onlineUrl: string | null },
): Promise<number> {
  const WEEK = 7 * 24 * 3600_000;
  const weeks = Math.min(40, Math.max(1, s.weeks));
  await db.transaction(async (tx) => {
    for (let i = 0; i < weeks; i++) {
      await tx.run("INSERT INTO sessions (id, cohort_id, title, starts_at, ends_at, location, online_url, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)", [
        newId(),
        s.cohortId,
        weeks > 1 ? `${s.title} (${i + 1}/${weeks})` : s.title,
        new Date(new Date(s.startsAt).getTime() + i * WEEK).toISOString(),
        new Date(new Date(s.endsAt).getTime() + i * WEEK).toISOString(),
        s.location,
        s.onlineUrl,
        nowIso(),
      ]);
    }
  });
  return weeks;
}

export async function setEnrollmentStatus(db: Db, cohortId: string, userId: string, status: "active" | "paused" | "cancelled"): Promise<void> {
  await db.run("UPDATE enrollments SET status = ? WHERE cohort_id = ? AND user_id = ?", [status, cohortId, userId]);
}

/**
 * Inscripción manual (por ejemplo, pago por transferencia). Si la persona no tiene cuenta, se la crea con una
 * contraseña temporal y se le envía el paso a paso por correo.
 */
export async function enrollManual(
  db: Db,
  e: { cohortId: string; cedula: string; fullName: string; email: string },
  baseUrl: string,
): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const cohort = await getCohort(db, e.cohortId);
  if (!cohort) return { ok: false, error: "La cohorte no existe." };

  const existing = await findUserByCedula(db, e.cedula);
  if (!existing && (!e.fullName || !e.email)) return { ok: false, error: "Esa cédula no tiene cuenta: escribe también el nombre y el correo para crearla." };

  const hash = existing ? "" : await hashPassword(generateTempPassword(24));
  const userId = existing?.id ?? newId();

  await db.transaction(async (tx) => {
    if (!existing) {
      await tx.run(
        `INSERT INTO users (id, cedula, full_name, email, role, password_hash, must_change_password, created_at) VALUES (?, ?, ?, ?, 'student', ?, 1, ?)`,
        [userId, e.cedula, e.fullName, e.email.toLowerCase(), hash, nowIso()],
      );
    }
    const already = await tx.get("SELECT 1 AS ok FROM enrollments WHERE user_id = ? AND cohort_id = ?", [userId, e.cohortId]);
    if (already) {
      await tx.run("UPDATE enrollments SET status = 'active' WHERE user_id = ? AND cohort_id = ?", [userId, e.cohortId]);
    } else {
      await tx.run("INSERT INTO enrollments (id, user_id, program_slug, cohort_id, order_id, status, created_at) VALUES (?, ?, ?, ?, NULL, 'active', ?)", [
        newId(), userId, cohort.program_slug, e.cohortId, nowIso(),
      ]);
    }
  });

  if (!existing) {
    await sendEmail(db, { to: e.email.toLowerCase(), ...manualAccountEmail({ fullName: e.fullName, cedula: e.cedula, setPasswordUrl: await createSetupLink(db, userId, baseUrl), programTitle: cohort.name, loginUrl: `${baseUrl}/campus/ingresar`, recoverUrl: `${baseUrl}/campus/recuperar` }) });
  }
  return { ok: true, created: !existing };
}

/** Cambia el rol de una persona. Una administradora no puede quitarse su propio rol. */
export async function setRoleByCedula(db: Db, actor: Pick<User, "id" | "role">, cedula: string, role: Role): Promise<{ ok: true } | { ok: false; error: string }> {
  if (actor.role !== "admin") return { ok: false, error: "Solo una administradora puede cambiar roles." };
  const target = await findUserByCedula(db, cedula);
  if (!target) return { ok: false, error: "No hay ninguna cuenta con esa cédula." };
  if (target.id === actor.id && role !== "admin") return { ok: false, error: "No puedes quitarte a ti misma el rol de administradora." };
  await db.run("UPDATE users SET role = ? WHERE id = ?", [role, target.id]);
  return { ok: true };
}

/** Crea la cuenta de una profesora o administradora y le envía su acceso. */
export async function createStaffAccount(
  db: Db,
  actor: Pick<User, "role">,
  s: { cedula: string; fullName: string; email: string; role: "teacher" | "admin" },
  baseUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (actor.role !== "admin") return { ok: false, error: "Solo una administradora puede crear cuentas." };
  if (await findUserByCedula(db, s.cedula)) return { ok: false, error: "Ya existe una cuenta con esa cédula. Cambia su rol en la lista." };
  const hash = await hashPassword(generateTempPassword(24));
  const userId = newId();
  await db.run(
    `INSERT INTO users (id, cedula, full_name, email, role, password_hash, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    [userId, s.cedula, s.fullName, s.email.toLowerCase(), s.role, hash, nowIso()],
  );
  await sendEmail(db, {
    to: s.email.toLowerCase(),
    ...manualAccountEmail({ fullName: s.fullName, cedula: s.cedula, setPasswordUrl: await createSetupLink(db, userId, baseUrl), programTitle: null, loginUrl: `${baseUrl}/campus/ingresar`, recoverUrl: `${baseUrl}/campus/recuperar` }),
  });
  return { ok: true };
}

