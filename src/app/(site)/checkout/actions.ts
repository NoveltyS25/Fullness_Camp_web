"use server";

import { redirect } from "next/navigation";
import { normalizeWhatsapp } from "@/lib/campus/phone";
import { getDb } from "@/server/db";
import { createOrder } from "@/server/orders";
import { checkoutPathFor, paymentProvider } from "@/server/payments";
import { normalizeCedula } from "@/server/security";

export interface CheckoutState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function startCheckoutAction(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const name = text(fd, "name").slice(0, 120);
  const cedula = normalizeCedula(text(fd, "cedula"));
  const email = text(fd, "email").toLowerCase();
  const rawPhone = text(fd, "phone");
  const phone = rawPhone ? normalizeWhatsapp(rawPhone) : null;

  if (name.split(/\s+/).length < 2) return { error: "Escribe tu nombre y apellido." };
  if (!cedula) return { error: "Escribe tu cédula (solo números, sin puntos)." };
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido: ahí te enviaremos el acceso." };
  if (rawPhone && !phone) return { error: "El número de WhatsApp no es válido. Ejemplo: 311 674 1900" };
  if (fd.get("terms") !== "on") return { error: "Debes aceptar los términos y la política de privacidad para continuar." };

  let slugs: string[] = [];
  try {
    const parsed: unknown = JSON.parse(text(fd, "slugs"));
    if (Array.isArray(parsed)) slugs = parsed.filter((s): s is string => typeof s === "string").slice(0, 20);
  } catch {
    return { error: "No pudimos leer tu carrito. Vuelve al carrito e inténtalo de nuevo." };
  }

  // El precio SIEMPRE se calcula en el servidor con el catálogo; del navegador solo llegan los identificadores.
  const result = await createOrder(getDb(), { cedula, name, email, phone }, slugs, text(fd, "coupon") || null, paymentProvider(), text(fd, "attribution") || null);
  if (!result.ok) return { error: result.error };

  redirect(checkoutPathFor(result.orderId));
}
