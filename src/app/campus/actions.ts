"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { normalizeWhatsapp } from "@/lib/campus/phone";
import { fromLocalInput } from "@/lib/campus/time";
import { consumePasswordReset, createPasswordReset, login, peekPasswordReset } from "@/server/auth";
import { markAllRead, processPendingDeliveries, rescheduleSession, updateProfile } from "@/server/campus";
import { getDb } from "@/server/db";
import { sendEmail } from "@/server/outbox";
import { hashToken, normalizeCedula, validateNewPassword, verifyPassword } from "@/server/security";
import { passwordResetEmail } from "@/server/templates";
import { findUserByCedula, getPasswordHash, setPassword } from "@/server/users";
import { baseUrl, clientIp, currentSessionToken, endSession, getCurrentUser, startSession } from "@/server/web";

export interface FormState {
  error?: string;
  message?: string;
}

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const result = await login(getDb(), text(fd, "cedula"), text(fd, "password"), await clientIp());
  if (!result.ok) {
    if (result.reason === "locked") return { error: "Demasiados intentos fallidos. Espera 15 minutos o recupera tu contraseña." };
    if (result.reason === "bad-input") return { error: "Escribe tu cédula (solo números) y tu contraseña." };
    return { error: "La cédula o la contraseña no son correctas." };
  }
  await startSession(result.token);
  redirect(result.user.must_change_password ? "/campus/cambiar-clave" : "/campus");
}

export async function logoutAction() {
  await endSession();
  redirect("/campus/ingresar");
}

/** Primer ingreso (contraseña temporal) o cambio voluntario. En el cambio voluntario se pide la contraseña actual. */
export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const token = await currentSessionToken();
  if (!user || !token) redirect("/campus/ingresar");

  const next = text(fd, "new_password");
  if (next !== text(fd, "confirm_password")) return { error: "Las dos contraseñas nuevas no coinciden." };
  const problem = validateNewPassword(next, user.cedula);
  if (problem) return { error: problem };

  const db = getDb();
  const currentHash = await getPasswordHash(db, user.id);
  if (await verifyPassword(next, currentHash ?? "")) return { error: "Elige una contraseña diferente a la actual." };
  if (!user.must_change_password) {
    if (!(await verifyPassword(text(fd, "current_password"), currentHash ?? ""))) return { error: "Tu contraseña actual no es correcta." };
  }

  await setPassword(db, user.id, next, hashToken(token));
  redirect("/campus?bienvenida=1");
}

/** Siempre responde lo mismo, exista o no la cuenta, para no revelar quién está registrado. */
export async function recoverAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const generic = { message: "Si los datos coinciden con una cuenta, te enviamos un correo con el enlace para crear una contraseña nueva." };
  const cedula = normalizeCedula(text(fd, "cedula"));
  const email = text(fd, "email").trim().toLowerCase();
  if (!cedula || !email) return { error: "Escribe tu cédula y el correo con el que te inscribiste." };

  const db = getDb();
  const user = await findUserByCedula(db, cedula);
  if (user && user.email.toLowerCase() === email) {
    const token = await createPasswordReset(db, user.id);
    await sendEmail(db, { to: user.email, ...passwordResetEmail({ fullName: user.full_name, resetUrl: `${await baseUrl()}/campus/restablecer?token=${token}` }) });
  }
  return generic;
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const token = text(fd, "token");
  const next = text(fd, "new_password");
  if (next !== text(fd, "confirm_password")) return { error: "Las dos contraseñas no coinciden." };

  const db = getDb();
  if (!(await peekPasswordReset(db, token))) return { error: "Este enlace ya no es válido. Pide uno nuevo." };
  const userId = await consumePasswordReset(db, token);
  if (!userId) return { error: "Este enlace ya no es válido. Pide uno nuevo." };

  const row = await db.get<{ cedula: string }>("SELECT cedula FROM users WHERE id = ?", [userId]);
  const problem = validateNewPassword(next, row?.cedula ?? "");
  if (problem) {
    // El enlace ya se consumió: se genera otro para que pueda corregir sin pedirlo de nuevo.
    const again = await createPasswordReset(db, userId);
    redirect(`/campus/restablecer?token=${again}&error=${encodeURIComponent(problem)}`);
  }
  await setPassword(db, userId, next);
  redirect(`/campus/ingresar?clave=ok&cedula=${row?.cedula ?? ""}`);
}

export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");

  const fullName = text(fd, "full_name").trim().slice(0, 120);
  const rawPhone = text(fd, "whatsapp_phone").trim();
  const notifyEmail = fd.get("notify_email") === "on";
  const notifyWhatsapp = fd.get("notify_whatsapp") === "on";

  const phone = rawPhone ? normalizeWhatsapp(rawPhone) : null;
  if (rawPhone && !phone) return { error: "El número de WhatsApp no es válido. Ejemplo: 311 674 1900" };
  if (notifyWhatsapp && !phone) return { error: "Para recibir avisos por WhatsApp escribe tu número." };
  if (!fullName) return { error: "Escribe tu nombre." };

  await updateProfile(getDb(), user.id, { fullName, phone, notifyEmail, notifyWhatsapp });
  revalidatePath("/campus", "layout");
  return { message: "Datos guardados." };
}

export async function markAllReadAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  await markAllRead(getDb(), user.id);
  revalidatePath("/campus", "layout");
}

export async function rescheduleAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");

  const startsAt = fromLocalInput(text(fd, "starts_at"));
  const endsAt = fromLocalInput(text(fd, "ends_at"));
  if (!startsAt || !endsAt) return { error: "Revisa la fecha y la hora de inicio y de fin." };

  const db = getDb();
  const result = await rescheduleSession(db, user, {
    sessionId: text(fd, "session_id"),
    startsAt,
    endsAt,
    location: text(fd, "location"),
    onlineUrl: text(fd, "online_url"),
    status: text(fd, "status") === "cancelled" ? "cancelled" : "scheduled",
    reason: text(fd, "reason").slice(0, 500),
  });
  if (!result.ok) return { error: result.error };

  // Los correos y WhatsApp salen después de responder, para que la profesora no espere.
  const base = await baseUrl();
  after(async () => {
    try {
      await processPendingDeliveries(db, base);
    } catch (e) {
      console.error("No se pudieron procesar los avisos", e);
    }
  });

  revalidatePath("/campus", "layout");
  redirect(`/campus/profesor?guardado=${result.notified}`);
}
