import "server-only";

export class NotConfiguredError extends Error {}

/** Correo con Resend. */
export async function sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) throw new NotConfiguredError("Resend no está configurado (RESEND_API_KEY, RESEND_FROM)");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

/**
 * WhatsApp Cloud API (Meta). Para escribirle primero a una estudiante hay que usar una PLANTILLA
 * aprobada por Meta. Plantilla esperada (idioma es), con 3 variables en el cuerpo:
 *   "Hola {{1}}, tu clase {{2}} {{3}}. Revisa tu horario en el campus de Fullness Camp."
 */
export async function sendWhatsappTemplate(to: string, params: [string, string, string]): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new NotConfiguredError("WhatsApp no está configurado (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID)");

  const template = process.env.WHATSAPP_TEMPLATE_SCHEDULE_CHANGE ?? "cambio_de_horario";
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";

  const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: "es" },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
      },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
