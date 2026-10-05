"use server";

import { redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { normalizeWhatsapp } from "@/lib/campus/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { getDb } from "@/server/db";
import { createLead } from "@/server/leads";
import { sendEmail } from "@/server/outbox";
import { leadEmail } from "@/server/templates";
import { baseUrl, clientIp } from "@/server/web";

export interface LeadState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function createLeadAction(_prev: LeadState, fd: FormData): Promise<LeadState> {
  const slug = text(fd, "slug");
  const program = getProgram(slug);
  if (!program) return { error: "No encontramos ese programa." };

  const interest = text(fd, "interest") === "waitlist" ? "waitlist" : "info";
  const fullName = text(fd, "name").slice(0, 120);
  const email = text(fd, "email").toLowerCase();
  const rawPhone = text(fd, "whatsapp");
  const whatsapp = rawPhone ? normalizeWhatsapp(rawPhone) : null;
  const first = fullName.split(/\s+/)[0] ?? "";
  const thanks = `/gracias?programa=${encodeURIComponent(slug)}&tipo=${interest}&nombre=${encodeURIComponent(first)}`;

  // Trampa para robots: el campo "website" está escondido; si viene lleno, no es una persona. Se simula éxito.
  if (text(fd, "website")) redirect(thanks);

  if (fullName.length < 2) return { error: "Escribe tu nombre." };
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido." };
  if (rawPhone && !whatsapp) return { error: "El número de WhatsApp no es válido. Ejemplo: 311 674 1900" };
  if (fd.get("consent") !== "on") return { error: "Marca la casilla para que podamos contactarte." };

  const db = getDb();
  const result = await createLead(db, { programSlug: slug, fullName, email, whatsapp, interest, attribution: text(fd, "attribution") || null, ip: await clientIp() });
  if (!result.ok) return { error: "Hemos recibido muchas solicitudes desde tu conexión. Inténtalo de nuevo en una hora o escríbenos por WhatsApp." };

  if (!result.duplicate) {
    const base = await baseUrl();
    await sendEmail(db, {
      to: email,
      ...leadEmail({
        fullName,
        programTitle: program.title,
        interest,
        programUrl: `${base}/programas/${slug}`,
        whatsappUrl: whatsappLink(`Hola, quisiera información sobre: ${program.title}`),
      }),
    });
  }
  redirect(thanks);
}
