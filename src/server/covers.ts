import { newId, nowIso, type Db } from "./db/index.ts";
import { PENDING_PREFIX, type User } from "./users.ts";

/**
 * Suplencias: una docente le pide a otra que la supla en una de sus clases (asignaturas). Si la otra acepta, la clase pasa a ser
 * suya de inmediato. Las estudiantes NO reciben aviso del cambio de docente: solo ven el nombre nuevo. La nueva docente puede mover
 * los horarios, y ESOS cambios sí se avisan a las estudiantes (así funciona «Cambiar horario»).
 */

type Actor = Pick<User, "id" | "role">;
export type CoverResult = { ok: true } | { ok: false; error: string };

export interface CoverRequest {
  id: string;
  class_id: string;
  class_title: string;
  from_user: string;
  from_name: string;
  to_user: string;
  to_name: string;
  message: string | null;
  status: "pendiente" | "aceptada" | "rechazada" | "cancelada";
  created_at: string;
}

const COVER_SELECT = `SELECT r.id, r.class_id, c.title AS class_title, r.from_user, f.full_name AS from_name, r.to_user, t.full_name AS to_name, r.message, r.status, r.created_at
  FROM class_cover_requests r JOIN classes c ON c.id = r.class_id JOIN users f ON f.id = r.from_user JOIN users t ON t.id = r.to_user`;

async function notify(db: Db, userId: string, title: string, body: string): Promise<void> {
  await db.run("INSERT INTO notifications (id, user_id, title, body, created_at) VALUES (?, ?, ?, ?, ?)", [newId(), userId, title, body, nowIso()]);
}

/** Docentes a quienes se les puede pedir una suplencia: con cuenta ya registrada, y que no sea quien la pide. */
export function listCoverCandidates(db: Db, exceptUserId: string): Promise<{ id: string; full_name: string }[]> {
  return db.all(
    "SELECT id, full_name FROM users WHERE role IN ('teacher', 'admin') AND id <> ? AND cedula NOT LIKE ? ORDER BY full_name",
    [exceptUserId, `${PENDING_PREFIX}%`],
  );
}

export async function requestCover(db: Db, actor: Actor, classId: string, toUserId: string, message: string): Promise<CoverResult> {
  const c = await db.get<{ title: string; teacher_id: string | null }>("SELECT title, teacher_id FROM classes WHERE id = ?", [classId]);
  if (!c || c.teacher_id !== actor.id || (actor.role !== "teacher" && actor.role !== "admin")) return { ok: false, error: "Solo la docente de esta clase puede pedir que la suplan." };
  if (toUserId === actor.id) return { ok: false, error: "Elige a otra docente." };
  const to = await db.get<{ full_name: string }>("SELECT full_name FROM users WHERE id = ? AND role IN ('teacher', 'admin') AND cedula NOT LIKE ?", [toUserId, `${PENDING_PREFIX}%`]);
  if (!to) return { ok: false, error: "Esa persona no puede recibir la solicitud: debe ser docente y haber completado su registro." };
  if (await db.get("SELECT 1 AS ok FROM class_cover_requests WHERE class_id = ? AND status = 'pendiente'", [classId])) {
    return { ok: false, error: "Esta clase ya tiene una solicitud pendiente. Cancélala si quieres pedírsela a otra docente." };
  }
  const from = await db.get<{ full_name: string }>("SELECT full_name FROM users WHERE id = ?", [actor.id]);
  const note = message.trim().slice(0, 500) || null;
  await db.transaction(async (tx) => {
    await tx.run("INSERT INTO class_cover_requests (id, class_id, from_user, to_user, message, status, created_at) VALUES (?, ?, ?, ?, ?, 'pendiente', ?)", [newId(), classId, actor.id, toUserId, note, nowIso()]);
    await notify(tx, toUserId, `${from?.full_name ?? "Una docente"} te pide que la supla en «${c.title}»`, `${note ? `${note} ` : ""}Entra a «Mis clases» para aceptar o rechazar la solicitud.`);
  });
  return { ok: true };
}

export function incomingCoverRequests(db: Db, userId: string): Promise<CoverRequest[]> {
  return db.all<CoverRequest>(`${COVER_SELECT} WHERE r.to_user = ? AND r.status = 'pendiente' ORDER BY r.created_at`, [userId]);
}

export function pendingCoverForClass(db: Db, classId: string): Promise<CoverRequest | undefined> {
  return db.get<CoverRequest>(`${COVER_SELECT} WHERE r.class_id = ? AND r.status = 'pendiente'`, [classId]);
}

/** La docente que recibió la solicitud la acepta o la rechaza. Al aceptar, la clase pasa a ser suya sin avisar a las estudiantes. */
export async function respondCover(db: Db, actor: Actor, requestId: string, accept: boolean): Promise<CoverResult> {
  return db.transaction(async (tx): Promise<CoverResult> => {
    const r = await tx.get<CoverRequest>(`${COVER_SELECT} WHERE r.id = ?`, [requestId]);
    if (!r || r.to_user !== actor.id) return { ok: false, error: "No encontramos esa solicitud." };
    if (r.status !== "pendiente") return { ok: false, error: "Esta solicitud ya fue respondida o cancelada." };

    if (!accept) {
      await tx.run("UPDATE class_cover_requests SET status = 'rechazada', resolved_at = ? WHERE id = ?", [nowIso(), requestId]);
      await notify(tx, r.from_user, `${r.to_name} no puede suplirte en «${r.class_title}»`, "La clase sigue a tu nombre. Puedes pedírsela a otra docente.");
      return { ok: true };
    }
    const c = await tx.get<{ teacher_id: string | null }>("SELECT teacher_id FROM classes WHERE id = ?", [r.class_id]);
    if (c?.teacher_id !== r.from_user) {
      await tx.run("UPDATE class_cover_requests SET status = 'cancelada', resolved_at = ? WHERE id = ?", [nowIso(), requestId]);
      return { ok: false, error: "Esta clase ya no está a nombre de quien te la pidió. La solicitud se canceló." };
    }
    await tx.run("UPDATE classes SET teacher_id = ? WHERE id = ?", [actor.id, r.class_id]);
    await tx.run("UPDATE class_cover_requests SET status = 'aceptada', resolved_at = ? WHERE id = ?", [nowIso(), requestId]);
    await notify(tx, r.from_user, `${r.to_name} aceptó suplirte en «${r.class_title}»`, "La clase ya pasó a su nombre. Las estudiantes no reciben aviso de este cambio.");
    return { ok: true };
  });
}

export async function cancelCover(db: Db, actor: Actor, requestId: string): Promise<CoverResult> {
  const r = await db.get<{ from_user: string; status: string }>("SELECT from_user, status FROM class_cover_requests WHERE id = ?", [requestId]);
  if (!r || r.from_user !== actor.id || r.status !== "pendiente") return { ok: false, error: "No encontramos una solicitud pendiente tuya." };
  await db.run("UPDATE class_cover_requests SET status = 'cancelada', resolved_at = ? WHERE id = ?", [nowIso(), requestId]);
  return { ok: true };
}
