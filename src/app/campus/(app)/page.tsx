import Link from "next/link";
import { SessionCard, type SessionRow } from "@/components/campus/SessionCard";
import { getCurrentProfile } from "@/lib/campus/auth";
import { dayKey, formatDay } from "@/lib/campus/time";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mi horario" };

export default async function MiHorario() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // La seguridad por filas deja ver solo las sesiones de las cohortes de la usuaria.
  const { data } = await supabase
    .from("sessions")
    .select("id, title, starts_at, ends_at, location, online_url, status, cohorts(name, sede)")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at")
    .limit(80)
    .returns<SessionRow[]>();

  const sessions = data ?? [];
  const byDay = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const k = dayKey(s.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Hola{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
      <p className="mb-8 text-lg text-muted">Estas son tus próximas clases.</p>

      {profile && !profile.full_name && (
        <p className="mb-8 rounded-2xl bg-clay-soft p-4 text-lg">
          Completa tu nombre y tu WhatsApp en <Link href="/campus/perfil" className="font-medium underline">Mi perfil</Link> para recibir avisos si cambia un horario.
        </p>
      )}

      {sessions.length === 0 ? (
        <div className="rounded-3xl border border-clay-soft bg-white p-8 text-center">
          <p className="text-xl">Aún no tienes clases programadas.</p>
          <p className="mt-2 text-muted">Cuando te inscribas a un programa, tu horario aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...byDay.entries()].map(([key, list]) => (
            <section key={key} aria-labelledby={`d-${key}`}>
              <h2 id={`d-${key}`} className="mb-3 text-xl font-bold">{formatDay(list[0].starts_at)}</h2>
              <ul className="space-y-3">{list.map((s) => <SessionCard key={s.id} s={s} />)}</ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
