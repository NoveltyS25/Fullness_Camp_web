import Link from "next/link";
import { redirect } from "next/navigation";
import { MonthCalendar } from "@/components/campus/MonthCalendar";
import { SessionCard } from "@/components/campus/SessionCard";
import { getProgram } from "@/data/programs";
import { currentMonth, monthRangeIso, monthTitle, parseMonth } from "@/lib/campus/calendar";
import { dayKey, formatDay } from "@/lib/campus/time";
import { whatsappLink } from "@/lib/whatsapp";
import { canAccessCampus, countPendingOrders, getEntitlements, getStudentSessionsBetween, type SessionRow } from "@/server/campus";
import { getDb } from "@/server/db";
import { getCurrentUser, getViews, VIEW_HOME } from "@/server/web";

export const metadata = { title: "Mi horario" };

export default async function MiHorario(props: PageProps<"/campus">) {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  const { bienvenida } = await props.searchParams;
  // Quien está en su panel de administración o de docente no ve aquí el horario de estudiante.
  const views = await getViews();
  if (views && views.current !== "student") redirect(VIEW_HOME[views.current]);

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

  // Certificaciones con inscripción activa (las terminadas ya no tienen clases; están en «Mis cursos»).
  const active = entitlements.filter((e) => !e.completed_at);
  if (active.length === 0) {
    return (
      <>
        <h1 className="mb-6 text-3xl font-bold sm:text-4xl">Hola, {first}</h1>
        <div className="rounded-3xl border border-clay-soft bg-white p-8">
          <h2 className="mb-3 text-2xl font-bold">No tienes cursos activos</h2>
          <p className="mb-6 text-lg">Tus cursos terminados y tus certificados están en «Mis cursos».</p>
          <Link href="/campus/cursos" className="btn btn-primary">Ir a mis cursos</Link>
        </div>
      </>
    );
  }

  const q = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const selected = active.find((e) => e.program_slug === one(q.cert)) ?? active[0];
  const { year, month } = parseMonth(one(q.mes)) ?? currentMonth();
  const range = monthRangeIso(year, month);
  const sessions: SessionRow[] = await getStudentSessionsBetween(db, user.id, selected.program_slug, range.from, range.to);
  const byDay = new Map<string, SessionRow[]>();
  for (const x of sessions) byDay.set(dayKey(x.starts_at), [...(byDay.get(dayKey(x.starts_at)) ?? []), x]);
  const title = getProgram(selected.program_slug)?.title ?? selected.program_slug;
  const mesParam = one(q.mes) ? `&mes=${one(q.mes)}` : "";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Hola, {first}</h1>
        {bienvenida && (
          <p role="status" className="my-4 rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">
            ✓ Tu contraseña quedó guardada. ¡Bienvenida a tu campus virtual!
          </p>
        )}
        <p className="text-lg text-muted">
          Tus clases de <strong className="text-ink">{title}</strong>
          {selected.cohort_name ? ` · Grupo: ${selected.cohort_name} · ${selected.sede}` : ""}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_17rem]">
        <MonthCalendar year={year} month={month} sessions={sessions} basePath="/campus" query={`cert=${selected.program_slug}`} editable={false} hideList />

        {active.length > 1 && (
          <aside aria-labelledby="certs" className="order-first lg:order-last">
            <h2 id="certs" className="mb-3 text-xl font-bold">Mis certificaciones</h2>
            <p className="mb-3 text-muted">Elige cuál quieres ver en el calendario.</p>
            <ul className="space-y-2">
              {active.map((e) => {
                const on = e.program_slug === selected.program_slug;
                return (
                  <li key={e.enrollment_id}>
                    <Link
                      href={`/campus?cert=${e.program_slug}${mesParam}`}
                      aria-current={on ? "true" : undefined}
                      className={`block rounded-2xl border-2 px-4 py-3 font-medium no-underline ${on ? "border-clay-dark bg-clay-dark text-white" : "border-clay-soft bg-white text-clay-dark hover:border-clay-dark"}`}
                    >
                      {getProgram(e.program_slug)?.title ?? e.program_slug}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>

      <section aria-labelledby="detalle">
        <h2 id="detalle" className="mb-4 text-2xl font-bold">Clases de {monthTitle(year, month).toLowerCase()}</h2>
        {sessions.length === 0 ? (
          <div className="rounded-3xl border border-clay-soft bg-white p-8 text-center">
            <p className="text-xl">No hay clases programadas este mes en esta certificación.</p>
            <p className="mt-2 text-muted">Cuando tus docentes definan sus horarios, aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {[...byDay.entries()].map(([key, list]) => (
              <div key={key}>
                <h3 className="mb-3 text-xl font-bold">{formatDay(list[0].starts_at)}</h3>
                <ul className="space-y-3">{list.map((x) => <SessionCard key={x.id} s={x} />)}</ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
