import { newId, nowIso, type Db } from "./db/index.ts";

export type SendStatus = "sent" | "logged" | "failed";
export interface SendResult {
  status: SendStatus;
  error?: string;
}

async function record(
  db: Db,
  channel: "email" | "whatsapp",
  to: string,
  subject: string | null,
  text: string,
  html: string | null,
  result: SendResult,
) {
  await db.run(
    "INSERT INTO outbox (id, channel, to_address, subject, body_text, body_html, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [newId(), channel, to, subject, text, html, result.status, result.error ?? null, nowIso()],
  );
}

/**
 * Envía un correo con Resend. Si Resend no está configurado (por ejemplo en la demostración), el correo
 * NO sale: queda registrado como "logged" y se puede ver en /demo/bandeja.
 */
export async function sendEmail(
  db: Db,
  msg: { to: string; subject: string; text: string; html: string },
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  let result: SendResult;

  if (!key || !from) {
    result = { status: "logged" };
  } else {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
      });
      result = res.ok ? { status: "sent" } : { status: "failed", error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    } catch (e) {
      result = { status: "failed", error: e instanceof Error ? e.message : String(e) };
    }
  }
  await record(db, "email", msg.to, msg.subject, msg.text, msg.html, result);
  return result;
}

/**
 * WhatsApp Cloud API (Meta). Para escribir primero a una persona se necesita una PLANTILLA aprobada por Meta:
 *   "Hola {{1}}, tu clase {{2}} {{3}}. Revisa tu horario en el campus de Fullness Camp."
 * Sin credenciales queda registrado como "logged" con el texto que se habría enviado.
 */
export async function sendWhatsapp(
  db: Db,
  msg: { to: string; params: [string, string, string] },
): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const preview = `Hola ${msg.params[0]}, tu clase ${msg.params[1]} ${msg.params[2]}. Revisa tu horario en el campus de Fullness Camp.`;
  let result: SendResult;

  if (!token || !phoneId) {
    result = { status: "logged" };
  } else {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION ?? "v21.0"}/${phoneId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: msg.to,
            type: "template",
            template: {
              name: process.env.WHATSAPP_TEMPLATE_SCHEDULE_CHANGE ?? "cambio_de_horario",
              language: { code: "es" },
              components: [{ type: "body", parameters: msg.params.map((text) => ({ type: "text", text })) }],
            },
          }),
        },
      );
      result = res.ok ? { status: "sent" } : { status: "failed", error: `WhatsApp ${res.status}: ${(await res.text()).slice(0, 300)}` };
    } catch (e) {
      result = { status: "failed", error: e instanceof Error ? e.message : String(e) };
    }
  }
  await record(db, "whatsapp", msg.to, null, preview, null, result);
  return result;
}
