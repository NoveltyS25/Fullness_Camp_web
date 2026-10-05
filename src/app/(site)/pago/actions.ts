"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/server/db";
import { completeOrder, failOrder } from "@/server/orders";
import { baseUrl, isDemoMode } from "@/server/web";

/**
 * Simula la respuesta de la pasarela. En producción esto lo hará el webhook de Bold llamando a la MISMA
 * función completeOrder(), así que el resto del flujo (cuenta, inscripción, correo) ya queda probado.
 */
export async function approveDemoPayment(fd: FormData) {
  if (!isDemoMode()) redirect("/");
  const orderId = String(fd.get("order_id") ?? "");
  await completeOrder(getDb(), orderId, `DEMO-${Date.now()}`, await baseUrl());
  redirect(`/pago/exito/${orderId}`);
}

export async function rejectDemoPayment(fd: FormData) {
  if (!isDemoMode()) redirect("/");
  await failOrder(getDb(), String(fd.get("order_id") ?? ""));
  redirect("/checkout?pago=rechazado");
}
