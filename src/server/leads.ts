import { createHash } from "node:crypto";
import { newId, nowIso, type Db } from "./db/index.ts";

export interface LeadInput {
  programSlug: string;
  fullName: string;
  email: string;
  whatsapp: string | null;
  /** "info": quiere el temario o hablar con una asesora. "waitlist": quiere que le avisen cuando abra el programa. */
  interest: "info" | "waitlist";
  attribution: string | null;
  ip: string;
}

export type LeadResult = { ok: true; duplicate: boolean } | { ok: false; error: "rate-limited" | "invalid" };

const MAX_PER_HOUR = 5;

/** Se guarda un hash de la IP (no la IP) solo para frenar el spam. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`fullness-leads:${ip}`).digest("hex").slice(0, 24);
}

/** Valida que la atribución sea un JSON corto y sencillo antes de guardarla. */
export function cleanAttribution(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 900) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && /^[a-z_]{2,20}$/.test(k)) out[k] = v.slice(0, 120);
    }
    return Object.keys(out).length ? JSON.stringify(out) : null;
  } catch {
    return null;
  }
}

export async function createLead(db: Db, input: LeadInput): Promise<LeadResult> {
  const ipHash = hashIp(input.ip);
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const recent = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM leads WHERE ip_hash = ? AND created_at >= ?", [ipHash, hourAgo]);
  if (Number(recent?.n ?? 0) >= MAX_PER_HOUR) return { ok: false, error: "rate-limited" };

  const email = input.email.toLowerCase();
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const dup = await db.get(
    "SELECT 1 AS ok FROM leads WHERE email = ? AND program_slug = ? AND interest = ? AND created_at >= ?",
    [email, input.programSlug, input.interest, dayAgo],
  );
  if (dup) return { ok: true, duplicate: true }; // misma persona enviando dos veces: no se duplica

  await db.run(
    `INSERT INTO leads (id, created_at, program_slug, full_name, email, whatsapp, interest, attribution, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId(), nowIso(), input.programSlug, input.fullName, email, input.whatsapp, input.interest, cleanAttribution(input.attribution), ipHash],
  );
  return { ok: true, duplicate: false };
}

export interface LeadRow {
  id: string;
  created_at: string;
  program_slug: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  interest: "info" | "waitlist";
  attribution: string | null;
}

export function listLeads(db: Db, limit = 300): Promise<LeadRow[]> {
  return db.all<LeadRow>(
    "SELECT id, created_at, program_slug, full_name, email, whatsapp, interest, attribution FROM leads ORDER BY created_at DESC LIMIT ?",
    [limit],
  );
}
