import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { POLITICA_POR_CATEGORIA, politica, type PoliticaKey } from "../data/politicas.ts";
import { getProgram, type ProgramCategory } from "../data/programs.ts";
import { addBusinessDays } from "./complaints.ts";
import { newId, nowIso, type Db } from "./db/index.ts";

/**
 * Aceptación del contrato y las políticas, con evidencia:
 *  - cada documento aceptado se guarda con la huella SHA-256 del PDF vigente en ese momento (si el PDF cambia, la huella cambia);
 *  - se guardan fecha y hora, dirección IP, navegador y cuáles casillas marcó la persona;
 *  - quien ya tiene cuenta debe aceptar cada documento vigente que le aplica la primera vez que entra al campus.
 */

export type ConsentName = "data" | "health" | "image" | "marketing" | "early_start";
export type Consents = Record<ConsentName, boolean>;

/** Documentos que aplican a una persona según el tipo de programas que compra o cursa. */
export function expectedDocumentKeys(categories: ProgramCategory[]): PoliticaKey[] {
  const specific = [...new Set(categories.map((c) => POLITICA_POR_CATEGORIA[c]))] as PoliticaKey[];
  return ["contrato", "general", ...specific, "asistencia"];
}

/** Huella SHA-256 del PDF publicado (por defecto en la carpeta public del proyecto). */
export function documentSha256(key: PoliticaKey, publicDir = join(process.cwd(), "public")): string {
  return createHash("sha256").update(readFileSync(join(publicDir, politica(key).href))).digest("hex");
}

export interface AcceptInput {
  userId: string | null;
  cedula: string;
  email: string;
  fullName: string;
  orderId: string | null;
  context: "checkout" | "campus";
  keys: PoliticaKey[];
  consents: Consents;
  ip: string;
  userAgent: string;
  publicDir?: string;
}

export async function recordAcceptance(db: Db, i: AcceptInput): Promise<string> {
  const id = newId();
  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO acceptances (id, user_id, cedula, email, full_name, order_id, context, consents, ip, user_agent, accepted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, i.userId, i.cedula, i.email.toLowerCase(), i.fullName, i.orderId, i.context, JSON.stringify(i.consents), i.ip.slice(0, 64), i.userAgent.slice(0, 300), nowIso()],
    );
    for (const key of new Set(i.keys)) {
      await tx.run("INSERT INTO acceptance_documents (acceptance_id, doc_key, title, sha256) VALUES (?, ?, ?, ?)", [id, key, politica(key).title, documentSha256(key, i.publicDir)]);
    }
  });
  return id;
}

/** Cuando el pago crea la cuenta, la aceptación hecha en el checkout queda ligada a ella. */
export async function linkAcceptanceToUser(db: Db, orderId: string, userId: string): Promise<void> {
  await db.run("UPDATE acceptances SET user_id = ? WHERE order_id = ? AND user_id IS NULL", [userId, orderId]);
}

export function acceptedDocumentsOfOrder(db: Db, orderId: string) {
  return db.all<{ doc_key: PoliticaKey; title: string }>(
    `SELECT d.doc_key, d.title FROM acceptance_documents d JOIN acceptances a ON a.id = d.acceptance_id WHERE a.order_id = ? ORDER BY d.rowid`,
    [orderId],
  );
}

/** Programas (de su categoría) en que la persona tiene una inscripción activa. */
async function activeCategories(db: Db, userId: string): Promise<ProgramCategory[]> {
  const rows = await db.all<{ program_slug: string }>("SELECT DISTINCT program_slug FROM enrollments WHERE user_id = ? AND status = 'active'", [userId]);
  return rows.map((r) => getProgram(r.program_slug)?.category).filter((c): c is ProgramCategory => !!c);
}

export async function expectedKeysFor(db: Db, user: { id: string; role: string }): Promise<PoliticaKey[]> {
  if (user.role !== "student") return [];
  const categories = await activeCategories(db, user.id);
  return categories.length === 0 ? [] : expectedDocumentKeys(categories);
}

/** Documentos vigentes que esta estudiante todavía no ha aceptado (por su cuenta o por su cédula). Vacío = al día. */
export async function missingDocuments(db: Db, user: { id: string; cedula: string; role: string }, publicDir?: string): Promise<PoliticaKey[]> {
  const keys = await expectedKeysFor(db, user);
  const missing: PoliticaKey[] = [];
  for (const key of keys) {
    const ok = await db.get(
      `SELECT 1 AS ok FROM acceptance_documents d JOIN acceptances a ON a.id = d.acceptance_id
       WHERE d.doc_key = ? AND d.sha256 = ? AND (a.user_id = ? OR a.cedula = ?)`,
      [key, documentSha256(key, publicDir), user.id, user.cedula],
    );
    if (!ok) missing.push(key);
  }
  return missing;
}

/** ¿Alguno de estos programas empieza a más tardar en 5 días hábiles (o ya empezó)? Entonces se pide el consentimiento de inicio anticipado. */
export async function startsWithinRetractWindow(db: Db, slugs: string[], today = new Date()): Promise<boolean> {
  const limit = addBusinessDays(today, 5).toISOString().slice(0, 10);
  for (const slug of slugs) {
    const c = await db.get(
      "SELECT 1 AS ok FROM cohorts WHERE program_slug = ? AND active = 1 AND starts_on IS NOT NULL AND starts_on <= ? LIMIT 1",
      [slug, limit],
    );
    if (c) return true;
  }
  return false;
}
