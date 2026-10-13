"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addModule, createClass, deleteClass, deleteModule, placeClass, unplaceClass, updateClass, type Result } from "@/server/classes";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  if (user.role !== "admin") redirect("/campus");
  return user;
}

function done(path: string, r: Result) {
  revalidatePath("/campus", "layout");
  redirect(`${path}?${r.ok ? "ok=1" : `error=${encodeURIComponent(r.error)}`}`);
}

const certPath = (fd: FormData) => `/campus/admin/certificaciones/${text(fd, "slug")}`;

export async function addModuleAction(fd: FormData) {
  const admin = await requireAdmin();
  done(certPath(fd), await addModule(getDb(), admin, text(fd, "slug"), text(fd, "title")));
}

export async function deleteModuleAction(fd: FormData) {
  const admin = await requireAdmin();
  done(certPath(fd), await deleteModule(getDb(), admin, text(fd, "module_id")));
}

/** Pone en un módulo una clase que ya existe. */
export async function placeClassAction(fd: FormData) {
  const admin = await requireAdmin();
  done(certPath(fd), await placeClass(getDb(), admin, text(fd, "module_id"), text(fd, "class_id")));
}

/** Crea una clase nueva (con o sin docente) y la pone en el módulo. */
export async function createAndPlaceClassAction(fd: FormData) {
  const admin = await requireAdmin();
  const db = getDb();
  const created = await createClass(db, admin, { title: text(fd, "title"), modality: text(fd, "modality") || "virtual", description: "", teacherId: text(fd, "teacher_id") });
  if (!created.ok) return done(certPath(fd), created);
  done(certPath(fd), await placeClass(db, admin, text(fd, "module_id"), created.id));
}

export async function unplaceClassAction(fd: FormData) {
  const admin = await requireAdmin();
  done(certPath(fd), await unplaceClass(getDb(), admin, text(fd, "placement_id")));
}

// ---- lista de clases y docentes

const CLASSES = "/campus/admin/clases";

export async function setClassTeacherAction(fd: FormData) {
  const admin = await requireAdmin();
  const db = getDb();
  const id = text(fd, "class_id");
  const current = await db.get<{ title: string; modality: string; description: string | null }>("SELECT title, modality, description FROM classes WHERE id = ?", [id]);
  if (!current) return done(CLASSES, { ok: false, error: "No encontramos esa clase." });
  done(CLASSES, await updateClass(db, admin, id, { title: current.title, modality: current.modality, description: current.description ?? "", teacherId: text(fd, "teacher_id") }));
}

export async function deleteClassAdminAction(fd: FormData) {
  const admin = await requireAdmin();
  done(CLASSES, await deleteClass(getDb(), admin, text(fd, "class_id")));
}
