"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { STATUSES, type ComplaintStatus } from "@/lib/complaint-kinds";
import { updateComplaint } from "@/server/complaints";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import type { FormState } from "../../../actions";

export async function updateComplaintAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  if (user.role !== "admin") redirect("/campus");

  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "") as ComplaintStatus;
  const resolution = String(fd.get("resolution") ?? "").trim().slice(0, 4000) || null;
  if (!(status in STATUSES)) return { error: "Elige un estado." };
  if ((status === "desestimada" || status === "cerrada") && !resolution) {
    return { error: "Escribe el motivo o la decisión: la política exige dar las razones al desestimar o cerrar." };
  }
  if (!(await updateComplaint(getDb(), id, status, resolution))) return { error: "No encontramos esa queja." };
  revalidatePath("/campus/admin/quejas");
  return { message: "Guardado." };
}
