import "server-only";
import { createAdminClient } from "../supabase/admin";
import { siteUrl } from "../supabase/config";
import { emailContent, greeting, whatsappSummary, type ChangeContext, type SessionData } from "./messages";
import { NotConfiguredError, sendEmail, sendWhatsappTemplate } from "./senders";

const MAX_ATTEMPTS = 3;
const STUCK_AFTER_MS = 15 * 60_000;

interface DeliveryRow {
  id: string;
  channel: "email" | "whatsapp";
  attempts: number;
  notifications: {
    profiles: { full_name: string; email: string | null; whatsapp_phone: string | null } | null;
    sessions: { title: string } | null;
    session_changes: { old_data: SessionData; new_data: SessionData; reason: string } | null;
  } | null;
}

/**
 * Envía los correos y WhatsApp pendientes. Es seguro llamarla varias veces a la vez:
 * cada envío se "reclama" antes de mandarse, así nadie recibe el mismo aviso dos veces.
 */
export async function processPendingDeliveries(limit = 25): Promise<{ sent: number; failed: number; skipped: number }> {
  const db = createAdminClient();
  const result = { sent: 0, failed: 0, skipped: 0 };

  // Envíos que quedaron "enviando" por una caída: se devuelven a la cola.
  await db
    .from("notification_deliveries")
    .update({ status: "pending", claimed_at: null })
    .eq("status", "sending")
    .lt("claimed_at", new Date(Date.now() - STUCK_AFTER_MS).toISOString());

  const { data: candidates } = await db
    .from("notification_deliveries")
    .select("id")
    .eq("status", "pending")
    .order("created_at")
    .limit(limit);
  if (!candidates?.length) return result;

  // Reclamar: solo las filas que realmente pasaron de pending a sending son nuestras.
  const { data: claimed } = await db
    .from("notification_deliveries")
    .update({ status: "sending", claimed_at: new Date().toISOString() })
    .in("id", candidates.map((c) => c.id))
    .eq("status", "pending")
    .select("id");
  if (!claimed?.length) return result;

  const { data: rows } = await db
    .from("notification_deliveries")
    .select(
      "id, channel, attempts, notifications(profiles:user_id(full_name, email, whatsapp_phone), sessions:session_id(title), session_changes:change_id(old_data, new_data, reason))",
    )
    .in("id", claimed.map((c) => c.id))
    .returns<DeliveryRow[]>();

  for (const row of rows ?? []) {
    const outcome = await deliver(row);
    if (outcome.kind === "sent") {
      result.sent++;
      await db.from("notification_deliveries").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
    } else if (outcome.kind === "skipped") {
      result.skipped++;
      await db.from("notification_deliveries").update({ status: "skipped", last_error: outcome.reason }).eq("id", row.id);
    } else {
      const attempts = row.attempts + 1;
      const giveUp = attempts >= MAX_ATTEMPTS;
      if (giveUp) result.failed++;
      await db
        .from("notification_deliveries")
        .update({ status: giveUp ? "failed" : "pending", attempts, last_error: outcome.reason, claimed_at: null })
        .eq("id", row.id);
    }
  }
  return result;
}

type Outcome = { kind: "sent" } | { kind: "skipped"; reason: string } | { kind: "error"; reason: string };

async function deliver(row: DeliveryRow): Promise<Outcome> {
  const n = row.notifications;
  const profile = n?.profiles;
  const change = n?.session_changes;
  if (!n || !profile || !change || !n.sessions) return { kind: "skipped", reason: "Faltan datos del aviso" };

  const ctx: ChangeContext = {
    studentName: profile.full_name,
    sessionTitle: n.sessions.title,
    oldData: change.old_data,
    newData: change.new_data,
    reason: change.reason,
    campusUrl: `${siteUrl()}/campus`,
  };

  try {
    if (row.channel === "email") {
      if (!profile.email) return { kind: "skipped", reason: "La estudiante no tiene correo" };
      const m = emailContent(ctx);
      await sendEmail(profile.email, m.subject, m.text, m.html);
    } else {
      if (!profile.whatsapp_phone) return { kind: "skipped", reason: "La estudiante no tiene WhatsApp" };
      const first = greeting(profile.full_name).replace(/^Hola\s?/, "") || "estudiante";
      await sendWhatsappTemplate(profile.whatsapp_phone, [first, `"${ctx.sessionTitle}"`, whatsappSummary(ctx)]);
    }
    return { kind: "sent" };
  } catch (e) {
    if (e instanceof NotConfiguredError) return { kind: "skipped", reason: e.message };
    return { kind: "error", reason: e instanceof Error ? e.message : String(e) };
  }
}
