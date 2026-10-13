"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addModule, addTopic, assignTopic, deleteModule, deleteTopic, unassignTopic, type Result } from "@/server/curriculum";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

type Actor = { id: string; role: "teacher" | "admin" | "student" };

/** Todas estas acciones exigen docente o administradora en el servidor y vuelven a la misma página con el resultado. */
async function run(fd: FormData, fn: (actor: Actor, db: ReturnType<typeof getDb>) => Promise<Result>) {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  if (user.role !== "teacher" && user.role !== "admin") redirect("/campus");
  const slug = text(fd, "slug");
  const result = await fn(user, getDb());
  revalidatePath(`/campus/profesor/temas/${slug}`);
  revalidatePath(`/campus/cursos/${slug}`);
  redirect(`/campus/profesor/temas/${slug}?${result.ok ? "ok=1" : `error=${encodeURIComponent(result.error)}`}`);
}

export const addTopicAction = async (fd: FormData) => run(fd, (a, db) => addTopic(db, a, text(fd, "module_id"), text(fd, "title")));
export const deleteTopicAction = async (fd: FormData) => run(fd, (a, db) => deleteTopic(db, a, text(fd, "topic_id")));
export const addModuleAction = async (fd: FormData) => run(fd, (a, db) => addModule(db, a, text(fd, "slug"), text(fd, "title")));
export const deleteModuleAction = async (fd: FormData) => run(fd, (a, db) => deleteModule(db, a, text(fd, "module_id")));
export const assignTopicAction = async (fd: FormData) =>
  run(fd, (a, db) =>
    assignTopic(db, a, {
      topicId: text(fd, "topic_id"),
      userId: text(fd, "user_id") || a.id,
      modality: text(fd, "modality"),
      classesCount: text(fd, "classes_count"),
      scheduleNote: text(fd, "schedule_note"),
    }),
  );
export const unassignTopicAction = async (fd: FormData) => run(fd, (a, db) => unassignTopic(db, a, text(fd, "topic_id"), text(fd, "user_id") || a.id));
