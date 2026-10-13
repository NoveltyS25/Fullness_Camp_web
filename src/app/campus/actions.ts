"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { normalizeWhatsapp } from "@/lib/campus/phone";
import { fromLocalInput } from "@/lib/campus/time";
import { consumePasswordReset, createPasswordReset, createSession, login, peekPasswordReset } from "@/server/auth";
import { markAllRead, processPendingDeliveries, rescheduleSession, updateProfile } from "@/server/campus";
import { cookies } from "next/headers";
import { getTeacherProfile, saveTeacherProfile, setTeacherPrograms } from "@/server/curriculum";
import { getDb } from "@/server/db";
import { sendEmail } from "@/server/outbox";
import { hashToken, normalizeCedula, validateNewPassword, verifyPassword } from "@/server/security";
import { passwordResetEmail } from "@/server/templates";
import { findUserByCedula, getPasswordHash, isPendingCedula, PENDING_PREFIX, setPassword } from "@/server/users";
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
  const rawCedula = text(fd, "cedula").trim();
  const cedula = normalizeCedula(rawCedula);
  const email = text(fd, "email").trim().toLowerCase();
  if (!email || (rawCedula && !cedula)) return { error: "Escribe tu cédula (solo números) y el correo con el que te inscribiste." };

  const db = getDb();
  // Sin cédula: solo para docentes que aún no completaron su registro (se buscan por correo).
  const user = cedula
    ? await findUserByCedula(db, cedula)
    : await db.get<{ id: string; full_name: string; email: string }>("SELECT id, full_name, email FROM users WHERE email = ? AND cedula LIKE ?", [email, `${PENDING_PREFIX}%`]);
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
  // Docente nueva: aún no tiene cédula registrada, así que entra directo a completar su registro.
  if (row && isPendingCedula(row.cedula)) {
    await startSession(await createSession(db, userId));
    redirect("/campus/bienvenida-docente");
  }
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Perfil que las estudiantes ven en el plan de estudios. Solo docentes y administradoras. */
export async function saveTeacherProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  if (user.role === "student") redirect("/campus");

  const email = text(fd, "contact_email").trim().toLowerCase();
  const rawPhone = text(fd, "contact_phone").trim();
  const phone = rawPhone ? normalizeWhatsapp(rawPhone) : null;
  const photo = text(fd, "photo_url").trim();
  if (email && !EMAIL_RE.test(email)) return { error: "El correo de contacto no es válido." };
  if (rawPhone && !phone) return { error: "El número de contacto no es válido. Ejemplo: 311 674 1900" };
  if (photo && !photo.startsWith("https://")) return { error: "El enlace de la foto debe empezar por https://" };

  const db = getDb();
  if (fd.has("programs_present")) await setTeacherPrograms(db, user.id, fd.getAll("programs").map(String));
  await saveTeacherProfile(db, user.id, {
    headline: text(fd, "headline").trim().slice(0, 140) || null,
    bio: text(fd, "bio").trim().slice(0, 1200) || null,
    contact_email: email || null,
    contact_phone: phone,
    photo_url: photo.slice(0, 500) || null,
  });
  revalidatePath("/campus", "layout");
  return { message: "Tu perfil de docente quedó guardado." };
}

/** Primer ingreso de una docente: nombre, cédula (con la que ingresará desde ahora), contacto para estudiantes y certificaciones. */
export async function completeTeacherOnboardingAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  if (user.role === "student") redirect("/campus");

  const fullName = text(fd, "full_name").trim().slice(0, 120);
  const cedula = normalizeCedula(text(fd, "cedula"));
  const email = text(fd, "contact_email").trim().toLowerCase();
  const phone = normalizeWhatsapp(text(fd, "contact_phone").trim());
  const programs = fd.getAll("programs").map(String);

  if (fullName.length < 3) return { error: "Escribe tu nombre completo." };
  if (!cedula) return { error: "Escribe tu número de cédula (solo números). Con él ingresarás al campus." };
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido para que tus estudiantes te contacten." };
  if (!phone) return { error: "Escribe un número de celular válido para el WhatsApp de tus estudiantes. Ejemplo: 311 674 1900" };
  if (programs.length === 0) return { error: "Elige al menos una certificación en la que eres docente." };

  const db = getDb();
  const taken = await findUserByCedula(db, cedula);
  if (taken && taken.id !== user.id) {
    return { error: "Esa cédula ya tiene una cuenta (por ejemplo, como estudiante). Escríbele a la administración: ella une tu cuenta de estudiante con el rol de docente." };
  }
  await db.run("UPDATE users SET full_name = ?, cedula = ?, whatsapp_phone = ? WHERE id = ?", [fullName, cedula, phone, user.id]);
  await setTeacherPrograms(db, user.id, programs);
  const prev = await getTeacherProfile(db, user.id);
  await saveTeacherProfile(db, user.id, { headline: prev?.headline ?? null, bio: prev?.bio ?? null, photo_url: prev?.photo_url ?? null, contact_email: email, contact_phone: phone });
  revalidatePath("/campus", "layout");
  redirect("/campus/profesor/temas?bienvenida=1");
}

/** Docentes con inscripción propia: alternan entre su panel de docente y su panel de estudiante (misma cédula). */
export async function switchViewAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  const store = await cookies();
  if (user.role !== "student" && text(fd, "view") === "student") {
    store.set("fc_view", "student", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 3600 });
  } else {
    store.delete("fc_view");
  }
  redirect("/campus");
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
