import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionCard } from "@/components/campus/SessionCard";
import { getProgram } from "@/data/programs";
import { dayKey, formatDay } from "@/lib/campus/time";
import { whatsappLink } from "@/lib/whatsapp";
import { canAccessCampus, countPendingOrders, getEntitlements, getStudentSessions, type SessionRow } from "@/server/campus";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Mi horario" };

export default async function MiHorario(props: PageProps<"/campus">) {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  const { bienvenida } = await props.searchParams;

  const db = getDb();
  const entitlements = await getEntitlements(db, user.id);
  const first = user.full_name.split(" ")[0];

  // Regla de acceso: una estudiante solo ve el contenido si tiene una inscripción activa (por pago o por una administradora).
  if (!canAccessCampus(user, entitlements)) {
    const pending = Number((await countPendingOrders(db, user.cedula))?.n ?? 0);
    return (
      <>
        <h1 className="mb-6 text-3xl font-bold sm:text-4xl">Hola, {first}</h1>
        <div className="rounded-3xl border border-clay-soft bg-white p-8">
          <h2 className="mb-3 text-2xl font-bold">Aún no tienes un programa activo</h2>
          <p className="mb-6 text-lg">
            {pending > 0
              ? "Tu pago todavía no está confirmado. En cuanto se confirme, tus clases aparecerán aquí."
              : "No encontramos una inscripción pagada con tu cédula. Cuando te inscribas y pagues, tus clases aparecerán aquí."}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/programas" className="btn btn-primary">Ver programas</Link>
            <a href={whatsappLink(`Hola, mi cédula es ${user.cedula} y no veo mi programa en el campus.`)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Hablar con una asesora
            </a>
          </div>
        </div>
      </>
    );
  }

  const sessions: SessionRow[] = await getStudentSessions(db, user.id);
  const byDay = new Map<string, SessionRow[]>();
  for (const s of sessions) byDay.set(dayKey(s.starts_at), [...(byDay.get(dayKey(s.starts_at)) ?? []), s]);

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Hola, {first}</h1>
      {bienvenida && (
        <p role="status" className="my-6 rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">
          ✓ Tu contraseña quedó guardada. ¡Bienvenida a tu campus virtual!
        </p>
      )}

      {entitlements.length > 0 && (
        <section aria-labelledby="programas" className="mb-12 mt-6">
          <h2 id="programas" className="mb-4 text-2xl font-bold">Mis programas</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {entitlements.map((e) => (
              <li key={e.enrollment_id} className="rounded-3xl border border-clay-soft bg-white p-5">
                <h3 className="text-xl font-bold text-clay-dark">{getProgram(e.program_slug)?.title ?? e.program_slug}</h3>
                {e.cohort_name ? (
                  <p className="mt-2 text-muted">Grupo: {e.cohort_name} · {e.sede}<br />Profesora: {e.teacher_name ?? "por asignar"}</p>
                ) : (
                  <p className="mt-2 text-muted">Pago confirmado ✓ Te asignaremos grupo y horario muy pronto.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="clases">
        <h2 id="clases" className="mb-4 text-2xl font-bold">Próximas clases</h2>
        {sessions.length === 0 ? (
          <div className="rounded-3xl border border-clay-soft bg-white p-8 text-center">
            <p className="text-xl">Aún no tienes clases programadas.</p>
            <p className="mt-2 text-muted">Cuando tu grupo tenga horario, aparecerá aquí.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {[...byDay.entries()].map(([key, list]) => (
              <div key={key}>
                <h3 className="mb-3 text-xl font-bold">{formatDay(list[0].starts_at)}</h3>
                <ul className="space-y-3">{list.map((s) => <SessionCard key={s.id} s={s} />)}</ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
