"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromLocalInput } from "@/lib/campus/time";
import { addClassSessions, createClass, deleteClass, updateClass } from "@/server/classes";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  if (user.role !== "teacher" && user.role !== "admin") redirect("/campus");
  return user;
}

const back = (path: string, error?: string) => redirect(error ? `${path}?error=${encodeURIComponent(error)}` : `${path}?ok=1`);

export async function createClassAction(fd: FormData) {
  const user = await requireStaff();
  const r = await createClass(getDb(), user, { title: text(fd, "title"), modality: text(fd, "modality"), description: text(fd, "description") });
  revalidatePath("/campus", "layout");
  if (!r.ok) back("/campus/profesor", r.error);
  else redirect(`/campus/profesor/clases/${r.id}?nueva=1`);
}

export async function updateClassAction(fd: FormData) {
  const user = await requireStaff();
  const id = text(fd, "class_id");
  const r = await updateClass(getDb(), user, id, { title: text(fd, "title"), modality: text(fd, "modality"), description: text(fd, "description") });
  revalidatePath("/campus", "layout");
  back(`/campus/profesor/clases/${id}`, r.ok ? undefined : r.error);
}

export async function deleteClassAction(fd: FormData) {
  const user = await requireStaff();
  const id = text(fd, "class_id");
  const r = await deleteClass(getDb(), user, id);
  revalidatePath("/campus", "layout");
  if (!r.ok) back(`/campus/profesor/clases/${id}`, r.error);
  else redirect("/campus/profesor");
}

export async function addSessionsAction(fd: FormData) {
  const user = await requireStaff();
  const id = text(fd, "class_id");
  const path = `/campus/profesor/clases/${id}`;
  const start = fromLocalInput(text(fd, "starts_at"));
  const end = fromLocalInput(text(fd, "ends_at"));
  if (!start || !end) back(path, "Revisa la fecha y la hora de inicio y de fin.");
  else {
    const r = await addClassSessions(getDb(), user, {
      classId: id,
      title: text(fd, "title"),
      startsAt: start,
      endsAt: end,
      weeks: Number.parseInt(text(fd, "weeks"), 10) || 1,
      location: text(fd, "location") || null,
      onlineUrl: text(fd, "online_url") || null,
    });
    revalidatePath("/campus", "layout");
    back(path, r.ok ? undefined : r.error);
  }
}
