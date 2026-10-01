"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/campus/auth";
import { fromLocalInput } from "@/lib/campus/time";
import { getProgram } from "@/data/programs";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "../../actions";

const SEDES = ["Bogotá", "Cajicá", "Tabío", "Online"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Toda acción de administración exige rol admin en el servidor (la base de datos lo exige también). */
async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/campus/ingresar");
  if (profile.role !== "admin") redirect("/campus");
  return createClient();
}

export async function createCohort(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  const programSlug = text(fd, "program_slug");
  const name = text(fd, "name").slice(0, 120);
  const sede = text(fd, "sede");
  const teacherId = text(fd, "teacher_id");
  const startsOn = text(fd, "starts_on");

  if (!getProgram(programSlug)) return { error: "Elige un programa." };
  if (!name) return { error: "Escribe un nombre para la cohorte." };
  if (!SEDES.includes(sede)) return { error: "Elige una sede." };

  const { data, error } = await supabase
    .from("cohorts")
    .insert({ program_slug: programSlug, name, sede, teacher_id: teacherId || null, starts_on: startsOn || null })
    .select("id")
    .single();
  if (error || !data) return { error: "No pudimos crear la cohorte." };

  revalidatePath("/campus/admin");
  redirect(`/campus/admin/cohortes/${data.id}`);
}

export async function addSessions(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  const cohortId = text(fd, "cohort_id");
  const title = text(fd, "title").slice(0, 160);
  const start = fromLocalInput(text(fd, "starts_at"));
  const end = fromLocalInput(text(fd, "ends_at"));
  const weeks = Math.min(40, Math.max(1, Number.parseInt(text(fd, "weeks"), 10) || 1));

  if (!title) return { error: "Escribe el título de la clase." };
  if (!start || !end) return { error: "Revisa la fecha y la hora de inicio y de fin." };
  if (new Date(end) <= new Date(start)) return { error: "La hora de fin debe ser después de la de inicio." };

  // Colombia no cambia de hora en el año, así que sumar 7 días exactos mantiene la misma hora.
  const WEEK = 7 * 24 * 3600_000;
  const rows = Array.from({ length: weeks }, (_, i) => ({
    cohort_id: cohortId,
    title: weeks > 1 ? `${title} (${i + 1}/${weeks})` : title,
    starts_at: new Date(new Date(start).getTime() + i * WEEK).toISOString(),
    ends_at: new Date(new Date(end).getTime() + i * WEEK).toISOString(),
    location: text(fd, "location") || null,
    online_url: text(fd, "online_url") || null,
  }));

  const { error } = await supabase.from("sessions").insert(rows);
  if (error) return { error: "No pudimos crear las clases." };

  revalidatePath(`/campus/admin/cohortes/${cohortId}`);
  return { message: `✓ ${rows.length === 1 ? "Clase creada" : `${rows.length} clases creadas`}.` };
}

export async function enrollStudent(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  const cohortId = text(fd, "cohort_id");
  const email = text(fd, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido." };

  const { data: student } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!student) return { error: "Esa persona aún no ha entrado al campus. Pídele que ingrese una vez con su correo en /campus/ingresar." };

  const { error } = await supabase
    .from("enrollments")
    .upsert({ cohort_id: cohortId, student_id: student.id, status: "active" });
  if (error) return { error: "No pudimos inscribirla." };

  revalidatePath(`/campus/admin/cohortes/${cohortId}`);
  return { message: "✓ Inscripción guardada." };
}

export async function setEnrollmentStatus(fd: FormData) {
  const supabase = await requireAdmin();
  const cohortId = text(fd, "cohort_id");
  const status = text(fd, "status");
  if (!["active", "paused", "cancelled"].includes(status)) return;
  await supabase.from("enrollments").update({ status }).eq("cohort_id", cohortId).eq("student_id", text(fd, "student_id"));
  revalidatePath(`/campus/admin/cohortes/${cohortId}`);
}

export async function setCohortActive(fd: FormData) {
  const supabase = await requireAdmin();
  const cohortId = text(fd, "cohort_id");
  await supabase.from("cohorts").update({ active: text(fd, "active") === "true" }).eq("id", cohortId);
  revalidatePath(`/campus/admin/cohortes/${cohortId}`);
  revalidatePath("/campus/admin");
}

export async function setRole(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  const email = text(fd, "email").toLowerCase();
  const role = text(fd, "role");
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido." };
  if (!["student", "teacher", "admin"].includes(role)) return { error: "Elige un rol." };

  const { error } = await supabase.rpc("admin_set_role", { p_email: email, p_role: role });
  if (error) return { error: error.message };

  revalidatePath("/campus/admin");
  return { message: "✓ Rol actualizado." };
}
