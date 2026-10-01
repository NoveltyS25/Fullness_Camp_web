"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { canTeach, getCurrentProfile } from "@/lib/campus/auth";
import { processPendingDeliveries } from "@/lib/campus/dispatch";
import { normalizeWhatsapp } from "@/lib/campus/phone";
import { fromLocalInput } from "@/lib/campus/time";
import { isSupabaseConfigured, siteUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMagicLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido." };
  if (!isSupabaseConfigured()) return { error: "El campus se está configurando. Inténtalo más tarde." };

  const origin = (await headers()).get("origin") ?? siteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/campus/callback` },
  });
  if (error) return { error: "No pudimos enviar el enlace. Inténtalo de nuevo en unos minutos." };
  return { message: `Te enviamos un enlace a ${email}. Ábrelo desde este mismo dispositivo para entrar.` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/campus/ingresar");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/campus/ingresar");

  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 120);
  const rawPhone = String(formData.get("whatsapp_phone") ?? "").trim();
  const notifyEmail = formData.get("notify_email") === "on";
  const notifyWhatsapp = formData.get("notify_whatsapp") === "on";

  const phone = rawPhone ? normalizeWhatsapp(rawPhone) : null;
  if (rawPhone && !phone) return { error: "El número de WhatsApp no es válido. Ejemplo: 311 674 1900" };
  if (notifyWhatsapp && !phone) return { error: "Para recibir avisos por WhatsApp escribe tu número." };
  if (!fullName) return { error: "Escribe tu nombre." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, whatsapp_phone: phone, notify_email: notifyEmail, notify_whatsapp: notifyWhatsapp })
    .eq("id", profile.id);
  if (error) return { error: "No pudimos guardar tus datos. Inténtalo de nuevo." };

  revalidatePath("/campus", "layout");
  return { message: "Datos guardados." };
}

export async function markAllRead() {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/campus", "layout");
}

export async function rescheduleSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/campus/ingresar");
  if (!canTeach(profile)) return { error: "Solo las profesoras pueden cambiar horarios." };

  const sessionId = String(formData.get("session_id") ?? "");
  const startsAt = fromLocalInput(String(formData.get("starts_at") ?? ""));
  const endsAt = fromLocalInput(String(formData.get("ends_at") ?? ""));
  const status = formData.get("status") === "cancelled" ? "cancelled" : "scheduled";
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);

  if (!startsAt || !endsAt) return { error: "Revisa la fecha y la hora de inicio y de fin." };
  if (new Date(endsAt) <= new Date(startsAt)) return { error: "La hora de fin debe ser después de la de inicio." };
  if (reason.length < 3) return { error: "Cuéntale a tus estudiantes el motivo del cambio." };

  const supabase = await createClient();
  const { data: notified, error } = await supabase.rpc("reschedule_session", {
    p_session: sessionId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_location: String(formData.get("location") ?? ""),
    p_online_url: String(formData.get("online_url") ?? ""),
    p_status: status,
    p_reason: reason,
  });
  if (error) return { error: error.message || "No pudimos guardar el cambio." };

  // Los correos y WhatsApp salen después de responder, para que la profesora no espere.
  after(async () => {
    try {
      await processPendingDeliveries();
    } catch (e) {
      console.error("No se pudieron procesar los avisos", e);
    }
  });

  revalidatePath("/campus", "layout");
  redirect(`/campus/profesor?guardado=${Number(notified) || 0}`);
}
