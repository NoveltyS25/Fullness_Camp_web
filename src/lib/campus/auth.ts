import { cache } from "react";
import { createClient } from "../supabase/server";

export interface Profile {
  id: string;
  role: "student" | "teacher" | "admin";
  full_name: string;
  email: string | null;
  whatsapp_phone: string | null;
  notify_email: boolean;
  notify_whatsapp: boolean;
}

/** Usuaria actual y su perfil; null si no ha iniciado sesión. getUser() valida el token con Supabase. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, whatsapp_phone, notify_email, notify_whatsapp")
    .eq("id", user.id)
    .single<Profile>();
  return data;
});

export function canTeach(p: Pick<Profile, "role">): boolean {
  return p.role === "teacher" || p.role === "admin";
}
