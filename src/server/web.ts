import { cookies, headers } from "next/headers";
import { cache } from "react";
import { destroySession, getUserBySessionToken } from "./auth.ts";
import { getEntitlements } from "./campus.ts";
import { getDb } from "./db/index.ts";
import type { User } from "./users.ts";

export const SESSION_COOKIE = "fc_session";
const MAX_AGE = 14 * 24 * 3600;

/** Persona con sesión iniciada (o null). Se consulta la base de datos en cada petición: no se confía en la cookie sola. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return (await getUserBySessionToken(getDb(), token)) ?? null;
});

export async function currentSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function startSession(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(getDb(), token);
  store.delete(SESSION_COOKIE);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconocida";
}

/** Dirección pública del sitio, para los enlaces de los correos. */
export async function baseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NODE_ENV === "production") return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("192.168.") ? "http" : "https");
  return `${proto}://${host}`;
}

export const isDemoMode = (): boolean => process.env.DEMO_MODE === "true";

// ------------------------------------------------------------------ paneles (vistas) del campus

export type View = "admin" | "teacher" | "student";

export const VIEW_LABEL: Record<View, string> = {
  admin: "Panel de administración",
  teacher: "Panel de docente",
  student: "Panel de estudiante",
};

export const VIEW_HOME: Record<View, string> = { admin: "/campus/admin", teacher: "/campus/profesor", student: "/campus" };

/**
 * Cada persona puede tener hasta tres paneles, con la misma cédula:
 *  - administración (rol administradora), docente (docentes y administradoras) y estudiante (si tiene inscripción propia).
 * La vista elegida se recuerda en una cookie; si ya no está disponible se usa la primera.
 */
export const getViews = cache(async (): Promise<{ user: User; available: View[]; current: View } | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const available: View[] = [];
  if (user.role === "admin") available.push("admin");
  if (user.role === "admin" || user.role === "teacher") available.push("teacher");
  if (user.role === "student" || (await getEntitlements(getDb(), user.id)).length > 0) available.push("student");
  const chosen = (await cookies()).get("fc_view")?.value as View | undefined;
  const current = chosen && available.includes(chosen) ? chosen : available[0];
  return { user, available, current };
});
