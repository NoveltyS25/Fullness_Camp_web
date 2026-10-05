"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { fromLocalInput } from "@/lib/campus/time";
import { addSessions, createCohort, createStaffAccount, enrollManual, setCohortActive, setEnrollmentStatus, setRoleByCedula } from "@/server/campus";
import { getDb } from "@/server/db";
import { normalizeCedula } from "@/server/security";
import type { Role } from "@/server/users";
import { baseUrl, getCurrentUser } from "@/server/web";
import type { FormState } from "../../actions";

const SEDES = ["Bogotá", "Cajicá", "Tabío", "Online"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Toda acción de administración exige rol admin en el servidor, sin importar lo que muestre la pantalla. */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  if (user.role !== "admin") redirect("/campus");
  return user;
}

export async function createCohortAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const programSlug = text(fd, "program_slug");
  const name = text(fd, "name").slice(0, 120);
  const sede = text(fd, "sede");
  if (!getProgram(programSlug)) return { error: "Elige un programa." };
  if (!name) return { error: "Escribe un nombre para la cohorte." };
  if (!SEDES.includes(sede)) return { error: "Elige una sede." };

  const id = await createCohort(getDb(), {
    programSlug,
    name,
    sede,
    teacherId: text(fd, "teacher_id") || null,
    startsOn: text(fd, "starts_on") || null,
  });
  revalidatePath("/campus/admin");
  redirect(`/campus/admin/cohortes/${id}`);
}

export async function addSessionsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const title = text(fd, "title").slice(0, 160);
  const start = fromLocalInput(text(fd, "starts_at"));
  const end = fromLocalInput(text(fd, "ends_at"));
  if (!title) return { error: "Escribe el título de la clase." };
  if (!start || !end) return { error: "Revisa la fecha y la hora de inicio y de fin." };
  if (new Date(end) <= new Date(start)) return { error: "La hora de fin debe ser después de la de inicio." };

  const cohortId = text(fd, "cohort_id");
  const n = await addSessions(getDb(), {
    cohortId,
    title,
    startsAt: start,
    endsAt: end,
    weeks: Number.parseInt(text(fd, "weeks"), 10) || 1,
    location: text(fd, "location") || null,
    onlineUrl: text(fd, "online_url") || null,
  });
  revalidatePath(`/campus/admin/cohortes/${cohortId}`);
  return { message: `✓ ${n === 1 ? "Clase creada" : `${n} clases creadas`}.` };
}

export async function enrollManualAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const cedula = normalizeCedula(text(fd, "cedula"));
  const email = text(fd, "email").toLowerCase();
  if (!cedula) return { error: "Escribe una cédula válida (solo números)." };
  if (email && !EMAIL_RE.test(email)) return { error: "El correo no es válido." };

  const cohortId = text(fd, "cohort_id");
  const r = await enrollManual(getDb(), { cohortId, cedula, fullName: text(fd, "full_name"), email }, await baseUrl());
  if (!r.ok) return { error: r.error };
  revalidatePath(`/campus/admin/cohortes/${cohortId}`);
  return { message: r.created ? "✓ Cuenta creada y estudiante inscrita. Le enviamos el paso a paso por correo." : "✓ Estudiante inscrita." };
}

export async function setEnrollmentStatusAction(fd: FormData) {
  await requireAdmin();
  const status = text(fd, "status");
  if (status !== "active" && status !== "paused" && status !== "cancelled") return;
  const cohortId = text(fd, "cohort_id");
  await setEnrollmentStatus(getDb(), cohortId, text(fd, "user_id"), status);
  revalidatePath(`/campus/admin/cohortes/${cohortId}`);
}

export async function setCohortActiveAction(fd: FormData) {
  await requireAdmin();
  const cohortId = text(fd, "cohort_id");
  await setCohortActive(getDb(), cohortId, text(fd, "active") === "true");
  revalidatePath(`/campus/admin/cohortes/${cohortId}`);
  revalidatePath("/campus/admin");
}

export async function setRoleAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const cedula = normalizeCedula(text(fd, "cedula"));
  const role = text(fd, "role");
  if (!cedula) return { error: "Escribe una cédula válida." };
  if (role !== "student" && role !== "teacher" && role !== "admin") return { error: "Elige un rol." };

  const r = await setRoleByCedula(getDb(), admin, cedula, role as Role);
  if (!r.ok) return { error: r.error };
  revalidatePath("/campus/admin");
  return { message: "✓ Rol actualizado." };
}

export async function createStaffAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const cedula = normalizeCedula(text(fd, "cedula"));
  const email = text(fd, "email").toLowerCase();
  const fullName = text(fd, "full_name").slice(0, 120);
  const role = text(fd, "role") === "admin" ? "admin" : "teacher";
  if (!cedula) return { error: "Escribe una cédula válida (solo números)." };
  if (!fullName) return { error: "Escribe el nombre." };
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido." };

  const r = await createStaffAccount(getDb(), admin, { cedula, fullName, email, role }, await baseUrl());
  if (!r.ok) return { error: r.error };
  revalidatePath("/campus/admin");
  return { message: "✓ Cuenta creada. Le enviamos su acceso por correo." };
}
