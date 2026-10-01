import { formatDay, formatRange } from "./time.ts";

export interface SessionData {
  starts_at: string;
  ends_at: string;
  location: string | null;
  online_url: string | null;
  status: "scheduled" | "cancelled";
}

export interface ChangeContext {
  studentName: string;
  sessionTitle: string;
  oldData: SessionData;
  newData: SessionData;
  reason: string;
  campusUrl: string;
}

export function describeSchedule(d: Pick<SessionData, "starts_at" | "ends_at">): string {
  return `${formatDay(d.starts_at)}, ${formatRange(d.starts_at, d.ends_at)}`;
}

export function greeting(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first ? `Hola ${first}` : "Hola";
}

/** Texto corto para WhatsApp (parámetro de la plantilla aprobada por Meta). */
export function whatsappSummary(c: ChangeContext): string {
  if (c.newData.status === "cancelled") return `se canceló. Motivo: ${c.reason}`;
  const where = c.newData.location ? ` en ${c.newData.location}` : c.newData.online_url ? " (online)" : "";
  return `ahora es el ${describeSchedule(c.newData)}${where}. Motivo: ${c.reason}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function emailContent(c: ChangeContext): { subject: string; text: string; html: string } {
  const cancelled = c.newData.status === "cancelled";
  const subject = cancelled ? `Clase cancelada: ${c.sessionTitle}` : `Cambio de horario: ${c.sessionTitle}`;

  const lines = [
    `${greeting(c.studentName)},`,
    "",
    cancelled ? `Tu clase "${c.sessionTitle}" fue cancelada.` : `Tu profesora cambió el horario de "${c.sessionTitle}".`,
    "",
    `Antes: ${describeSchedule(c.oldData)}`,
    cancelled ? "Ahora: cancelada" : `Ahora: ${describeSchedule(c.newData)}`,
  ];
  if (!cancelled && c.newData.location) lines.push(`Lugar: ${c.newData.location}`);
  if (!cancelled && c.newData.online_url) lines.push(`Enlace: ${c.newData.online_url}`);
  lines.push("", `Motivo: ${c.reason}`, "", `Puedes ver tu horario actualizado aquí: ${c.campusUrl}`, "", "Fullness Camp");

  const intro = cancelled
    ? `Tu clase <strong>${esc(c.sessionTitle)}</strong> fue cancelada.`
    : `Tu profesora cambió el horario de <strong>${esc(c.sessionTitle)}</strong>.`;
  const nowLine = cancelled ? "Ahora: cancelada" : `Ahora: ${esc(describeSchedule(c.newData))}`;
  const place = !cancelled && c.newData.location ? `<br>Lugar: ${esc(c.newData.location)}` : "";
  const link = !cancelled && c.newData.online_url ? `<br>Enlace: ${esc(c.newData.online_url)}` : "";

  const html =
    `<div style="font-family:Arial,sans-serif;font-size:18px;line-height:1.6;color:#3b2523;max-width:560px">` +
    `<p>${esc(greeting(c.studentName))},</p><p>${intro}</p>` +
    `<p>Antes: ${esc(describeSchedule(c.oldData))}<br><strong>${nowLine}</strong>${place}${link}</p>` +
    `<p>Motivo: ${esc(c.reason)}</p>` +
    `<p><a href="${esc(c.campusUrl)}" style="background:#7a4a45;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;display:inline-block">Ver mi horario</a></p>` +
    `<p style="color:#5d4542">Fullness Camp</p></div>`;

  return { subject, text: lines.join("\n"), html };
}
