import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/** Cliente de Supabase para Server Components y Server Actions, con la sesión de la usuaria. */
export async function createClient() {
  const cookieStore = await cookies();
  // Sin llaves (campus sin configurar) las páginas se renderizan en paralelo con el layout que redirige;
  // con valores de relleno el cliente no falla y sus consultas simplemente devuelven error/vacío.
  return createServerClient(SUPABASE_URL || "http://localhost:54321", SUPABASE_ANON_KEY || "sin-configurar", {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Desde un Server Component no se pueden escribir cookies; el proxy ya refresca la sesión.
        }
      },
    },
  });
}
