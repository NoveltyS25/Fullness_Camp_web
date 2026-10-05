import { redirect } from "next/navigation";
import { SessionCard, } from "@/components/campus/SessionCard";
import { dayKey, formatDay } from "@/lib/campus/time";
import { getTeacherSessions, type SessionRow } from "@/server/campus";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Mis clases" };

export default async function MisClases(props: PageProps<"/campus/profesor">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) redirect("/campus");
  const { guardado } = await props.searchParams;

  const sessions = await getTeacherSessions(getDb(), user);
  const byDay = new Map<string, SessionRow[]>();
  for (const s of sessions) byDay.set(dayKey(s.starts_at), [...(byDay.get(dayKey(s.starts_at)) ?? []), s]);

  const notified = guardado === undefined ? null : Number(Array.isArray(guardado) ? guardado[0] : guardado);

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Mis clases</h1>
      <p className="mb-8 text-lg text-muted">Si necesitas mover o cancelar una clase, tus estudiantes recibirán el aviso automáticamente.</p>

      {notified !== null && !Number.isNaN(notified) && (
        <p role="status" className="mb-8 rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">
          ✓ Cambio guardado.{" "}
          {notified === 0
            ? "No había estudiantes inscritas o no hubo cambios que avisar."
            : `Avisamos a ${notified} ${notified === 1 ? "estudiante" : "estudiantes"} en el campus, y por correo o WhatsApp según sus preferencias.`}
        </p>
      )}

      {sessions.length === 0 ? (
        <p className="rounded-3xl border border-clay-soft bg-white p-8 text-center text-xl">No tienes clases próximas asignadas.</p>
      ) : (
        <div className="space-y-8">
          {[...byDay.entries()].map(([key, list]) => (
            <section key={key} aria-labelledby={`d-${key}`}>
              <h2 id={`d-${key}`} className="mb-3 text-xl font-bold">{formatDay(list[0].starts_at)}</h2>
              <ul className="space-y-3">{list.map((s) => <SessionCard key={s.id} s={s} editHref={`/campus/profesor/sesion/${s.id}`} />)}</ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
