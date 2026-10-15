"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromLocalInput } from "@/lib/campus/time";
import { addClassSessions, addLesson, createClassWithSessions, deleteClass, deleteLesson, scheduleLesson, setClassProgress, updateClass } from "@/server/classes";
import type { FormState } from "@/app/campus/actions";
import { cancelCover, requestCover, respondCover } from "@/server/covers";
import { getDb } from "@/server/db";
import { sendEmail } from "@/server/outbox";
import { coverRequestEmail } from "@/server/templates";
import { baseUrl, getCurrentUser } from "@/server/web";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  if (user.role !== "teacher" && user.role !== "admin") redirect("/campus");
  return user;
}

const back = (path: string, error?: string) => redirect(error ? `${path}?error=${encodeURIComponent(error)}` : `${path}?ok=1`);

/** Crea la clase con su primer horario (todo obligatorio) y lleva a la docente al mes de su primera clase, donde ya aparece. */
export async function createClassAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireStaff();
  const start = fromLocalInput(text(fd, "starts_at"));
  const end = fromLocalInput(text(fd, "ends_at"));
  if (!start || !end) return { error: "Indica la fecha y la hora de inicio y de fin." };
  const r = await createClassWithSessions(getDb(), user, {
    title: text(fd, "title"),
    modality: text(fd, "modality"),
    description: text(fd, "description"),
    // En el panel de docente la clase es siempre de quien la crea (también si es administradora).
    teacherId: user.id,
    startsAt: start,
    endsAt: end,
    weeks: Number.parseInt(text(fd, "weeks"), 10),
    location: text(fd, "location"),
    onlineUrl: text(fd, "online_url"),
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/campus", "layout");
  const mes = new Date(new Date(start).getTime() - 5 * 3600_000).toISOString().slice(0, 7);
  redirect(`/campus/profesor?mes=${mes}&nueva=${r.id}`);
}

export async function addLessonAction(fd: FormData) {
  const user = await requireStaff();
  const id = text(fd, "class_id");
  const r = await addLesson(getDb(), user, id, text(fd, "title"), String(fd.get("topics") ?? ""));
  revalidatePath("/campus", "layout");
  back(`/campus/profesor/clases/${id}`, r.ok ? undefined : r.error);
}

export async function deleteLessonAction(fd: FormData) {
  const user = await requireStaff();
  const id = text(fd, "class_id");
  const r = await deleteLesson(getDb(), user, text(fd, "lesson_id"));
  revalidatePath("/campus", "layout");
  back(`/campus/profesor/clases/${id}`, r.ok ? undefined : r.error);
}

/** Le pone fecha, hora y lugar o enlace a una clase del temario. */
export async function scheduleLessonAction(fd: FormData) {
  const user = await requireStaff();
  const id = text(fd, "class_id");
  const path = `/campus/profesor/clases/${id}`;
  const start = fromLocalInput(text(fd, "starts_at"));
  const end = fromLocalInput(text(fd, "ends_at"));
  if (!start || !end) return back(path, "Indica la fecha y la hora de inicio y de fin.");
  const r = await scheduleLesson(getDb(), user, { lessonId: text(fd, "lesson_id"), startsAt: start, endsAt: end, location: text(fd, "location"), onlineUrl: text(fd, "online_url") });
  revalidatePath("/campus", "layout");
  back(path, r.ok ? undefined : r.error);
}

/** La docente marca si una estudiante aprobó, no aprobó o está en curso en su asignatura. */
export async function setProgressAction(fd: FormData) {
  const user = await requireStaff();
  const id = text(fd, "class_id");
  const r = await setClassProgress(getDb(), user, id, text(fd, "user_id"), text(fd, "status"));
  revalidatePath("/campus", "layout");
  back(`/campus/profesor/clases/${id}`, r.ok ? undefined : r.error);
}

/** Pide que otra docente supla la clase: ella recibe un aviso en el campus y por correo. */
export async function requestCoverAction(fd: FormData) {
  const user = await requireStaff();
  const id = text(fd, "class_id");
  const db = getDb();
  const to = text(fd, "to_user");
  const message = String(fd.get("message") ?? "");
  const r = await requestCover(db, user, id, to, message);
  if (r.ok) {
    const info = await db.get<{ class_title: string; to_name: string; to_email: string; from_name: string }>(
      `SELECT c.title AS class_title, t.full_name AS to_name, t.email AS to_email, f.full_name AS from_name
       FROM classes c, users t, users f WHERE c.id = ? AND t.id = ? AND f.id = ?`,
      [id, to, user.id],
    );
    if (info) {
      await sendEmail(db, {
        to: info.to_email,
        ...coverRequestEmail({ toName: info.to_name, fromName: info.from_name, classTitle: info.class_title, message: message.trim() || null, url: `${await baseUrl()}/campus/profesor` }),
      });
    }
  }
  revalidatePath("/campus", "layout");
  back(`/campus/profesor/clases/${id}`, r.ok ? undefined : r.error);
}

export async function cancelCoverAction(fd: FormData) {
  const user = await requireStaff();
  const id = text(fd, "class_id");
  const r = await cancelCover(getDb(), user, text(fd, "request_id"));
  revalidatePath("/campus", "layout");
  back(`/campus/profesor/clases/${id}`, r.ok ? undefined : r.error);
}

/** La docente que recibió la solicitud la acepta o la rechaza. */
export async function respondCoverAction(fd: FormData) {
  const user = await requireStaff();
  const r = await respondCover(getDb(), user, text(fd, "request_id"), text(fd, "decision") === "aceptar");
  revalidatePath("/campus", "layout");
  back("/campus/profesor", r.ok ? undefined : r.error);
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
