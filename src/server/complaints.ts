import { randomInt } from "node:crypto";
import { REVIEW_BUSINESS_DAYS, type ComplaintKind, type ComplaintStatus } from "../lib/complaint-kinds.ts";
import { newId, nowIso, type Db } from "./db/index.ts";
import { hashIp } from "./leads.ts";

const MAX_PER_HOUR = 3;

/** Suma días hábiles (lunes a viernes). No descuenta festivos: es una fecha de referencia para la administración. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  return d;
}

// Sin caracteres que se confunden (0/O, 1/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode(now: Date): string {
  const ymd = now.toISOString().slice(0, 10).replaceAll("-", "");
  let tail = "";
  for (let i = 0; i < 5; i++) tail += ALPHABET[randomInt(ALPHABET.length)];
  return `Q-${ymd}-${tail}`;
}

export interface ComplaintInput {
  kind: ComplaintKind;
  fullName: string;
  email: string;
  phone: string | null;
  accused: string;
  description: string;
  eventDate: string | null;
  eventPlace: string | null;
  witnesses: string | null;
  ip: string;
}

export type ComplaintResult = { ok: true; code: string } | { ok: false; error: "rate-limited" };

export async function createComplaint(db: Db, input: ComplaintInput): Promise<ComplaintResult> {
  const ipHash = hashIp(input.ip);
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const recent = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM complaints WHERE ip_hash = ? AND created_at >= ?", [ipHash, hourAgo]);
  if (Number(recent?.n ?? 0) >= MAX_PER_HOUR) return { ok: false, error: "rate-limited" };

  const now = new Date();
  const code = makeCode(now);
  await db.run(
    `INSERT INTO complaints (id, code, created_at, kind, full_name, email, phone, accused, description, event_date, event_place, witnesses, status, due_at, updated_at, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'recibida', ?, ?, ?)`,
    [
      newId(), code, now.toISOString(), input.kind, input.fullName, input.email.toLowerCase(), input.phone, input.accused, input.description,
      input.eventDate, input.eventPlace, input.witnesses, addBusinessDays(now, REVIEW_BUSINESS_DAYS).toISOString(), nowIso(), ipHash,
    ],
  );
  return { ok: true, code };
}

export interface ComplaintRow {
  id: string;
  code: string;
  created_at: string;
  kind: ComplaintKind;
  full_name: string;
  email: string;
  phone: string | null;
  accused: string;
  description: string;
  event_date: string | null;
  event_place: string | null;
  witnesses: string | null;
  status: ComplaintStatus;
  due_at: string;
  resolution: string | null;
  updated_at: string;
}

export function listComplaints(db: Db, limit = 300): Promise<ComplaintRow[]> {
  return db.all<ComplaintRow>(
    `SELECT id, code, created_at, kind, full_name, email, phone, accused, description, event_date, event_place, witnesses, status, due_at, resolution, updated_at
     FROM complaints ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
}

export async function updateComplaint(db: Db, id: string, status: ComplaintStatus, resolution: string | null): Promise<boolean> {
  const r = await db.run("UPDATE complaints SET status = ?, resolution = ?, updated_at = ? WHERE id = ?", [status, resolution, nowIso(), id]);
  return r.changes > 0;
}

/** Quejas sin decidir (recibida o en revisión). */
export async function countOpenComplaints(db: Db): Promise<number> {
  const r = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM complaints WHERE status IN ('recibida', 'en_revision')");
  return Number(r?.n ?? 0);
}
