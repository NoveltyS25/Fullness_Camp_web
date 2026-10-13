"use server";

import { redirect } from "next/navigation";
import { KINDS, REVIEW_BUSINESS_DAYS, type ComplaintKind } from "@/lib/complaint-kinds";
import { normalizeWhatsapp } from "@/lib/campus/phone";
import { createComplaint } from "@/server/complaints";
import { getDb } from "@/server/db";
import { sendEmail } from "@/server/outbox";
import { complaintReceivedEmail, complaintStaffEmail } from "@/server/templates";
import { baseUrl, clientIp } from "@/server/web";

export interface ComplaintState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

export async function createComplaintAction(_prev: ComplaintState, fd: FormData): Promise<ComplaintState> {
  // Trampa para robots (campo escondido). Se simula éxito sin guardar nada.
  if (text(fd, "website", 50)) redirect("/quejas/recibida?radicado=Q-00000000-XXXXX");

  const kind = text(fd, "kind", 20) as ComplaintKind;
  if (!(kind in KINDS)) return { error: "Elige el tipo de situación." };
  const fullName = text(fd, "name", 120);
  const email = text(fd, "email", 160).toLowerCase();
  const rawPhone = text(fd, "phone", 30);
  const phone = rawPhone ? normalizeWhatsapp(rawPhone) : null;
  const accused = text(fd, "accused", 200);
  const description = text(fd, "description", 4000);

  if (fullName.length < 3) return { error: "Escribe tu nombre completo. La política pide identificarte; tu información es confidencial." };
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido para responderte." };
  if (rawPhone && !phone) return { error: "El teléfono no es válido. Ejemplo: 311 674 1900" };
  if (accused.length < 2) return { error: "Escribe el nombre de la persona sobre quien presentas la queja." };
  if (description.length < 30) return { error: "Describe lo ocurrido con un poco más de detalle (mínimo 30 caracteres)." };
  if (fd.get("consent") !== "on") return { error: "Marca la casilla para confirmar que la información es cierta y autorizar su tratamiento." };

  const db = getDb();
  const result = await createComplaint(db, {
    kind, fullName, email, phone, accused, description,
    eventDate: text(fd, "event_date", 40) || null,
    eventPlace: text(fd, "event_place", 200) || null,
    witnesses: text(fd, "witnesses", 1500) || null,
    ip: await clientIp(),
  });
  if (!result.ok) return { error: "Recibimos varias solicitudes desde tu conexión. Inténtalo de nuevo en una hora o escríbenos por WhatsApp." };

  await sendEmail(db, { to: email, ...complaintReceivedEmail({ fullName, code: result.code, days: REVIEW_BUSINESS_DAYS }) });
  const staff = process.env.COMPLAINTS_EMAIL?.trim();
  if (staff) {
    await sendEmail(db, { to: staff, ...complaintStaffEmail({ code: result.code, kindLabel: KINDS[kind], panelUrl: `${await baseUrl()}/campus/admin/quejas` }) });
  }
  redirect(`/quejas/recibida?radicado=${encodeURIComponent(result.code)}`);
}
