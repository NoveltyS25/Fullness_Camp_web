import Link from "next/link";
import { redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { formatDate } from "@/lib/campus/time";
import { PROGRESS_LABEL, PROGRESS_TONE } from "@/lib/campus/progress";
import { canAccessCampus, getEntitlements } from "@/server/campus";
import { getStudentProgress } from "@/server/classes";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Mi avance" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MiAvance(props: PageProps<"/campus/avance">) {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  const db = getDb();
  const entitlements = await getEntitlements(db, user.id);
  if (!canAccessCampus(user, entitlements) || entitlements.length === 0) redirect("/campus");

  const q = await props.searchParams;
  const selected = entitlements.find((e) => e.program_slug === one(q.cert)) ?? entitlements[0];
  const title = getProgram(selected.program_slug)?.title ?? selected.program_slug;
  const p = await getStudentProgress(db, user.id, selected.program_slug);
  const pct = p.total === 0 ? 0 : Math.round((p.approved / p.total) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Mi avance</h1>
        <p className="text-lg text-muted">Tus asignaturas de <strong className="text-ink">{title}</strong>: cuáles ya viste, cuáles aprobaste y cuáles te faltan.</p>
      </div>

      {entitlements.length > 1 && (
        <nav aria-label="Mis certificaciones" className="flex flex-wrap items-center gap-2">
          <span className="text-muted">Ver avance de:</span>
          {entitlements.map((e) => {
            const on = e.program_slug === selected.program_slug;
            return (
              <Link
                key={e.enrollment_id}
                href={`/campus/avance?cert=${e.program_slug}`}
                aria-current={on ? "true" : undefined}
                className={`inline-flex min-h-12 items-center rounded-full border-2 px-5 font-medium no-underline ${on ? "border-clay-dark bg-clay-dark text-white" : "border-clay-dark text-clay-dark hover:bg-clay-soft"}`}
              >
                {getProgram(e.program_slug)?.title ?? e.program_slug}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-8">
          <section aria-labelledby="resumen" className="rounded-3xl border border-clay-soft bg-white p-6">
            <h2 id="resumen" className="mb-1 text-2xl font-bold">
              {p.approved} de {p.total} asignaturas aprobadas
            </h2>
            <div className="my-4 h-4 overflow-hidden rounded-full bg-clay-soft" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Asignaturas aprobadas">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
            </div>
            <ul className="flex flex-wrap gap-2 text-base">
              <li className={`rounded-full px-3 py-1 ${PROGRESS_TONE.aprobado}`}>{p.approved} {p.approved === 1 ? "aprobada" : "aprobadas"}</li>
              <li className={`rounded-full px-3 py-1 ${PROGRESS_TONE.en_curso}`}>{p.inCourse} en curso</li>
              <li className={`rounded-full px-3 py-1 ${PROGRESS_TONE.pendiente}`}>{p.pending} por tomar</li>
              {p.notApproved > 0 && <li className={`rounded-full px-3 py-1 ${PROGRESS_TONE.no_aprobado}`}>{p.notApproved} por repetir</li>}
            </ul>
            {p.allApproved && (
              <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-lg font-medium text-emerald-900">
                ¡Aprobaste todas las asignaturas! Te falta solo la tesina, que presentas a Lila Govardhan, y la confirmación de la escuela para tu certificado.
              </p>
            )}
          </section>

          {p.modules.length === 0 ? (
            <p className="rounded-3xl border border-clay-soft bg-white p-8 text-center text-xl">El plan de estudios de esta certificación se está preparando.</p>
          ) : (
            p.modules.map((m, mi) => (
              <section key={m.id} aria-labelledby={`m-${m.id}`} className="rounded-3xl border border-clay-soft bg-white p-5 sm:p-6">
                <h2 id={`m-${m.id}`} className="mb-3 text-xl font-bold text-clay-dark">Módulo {mi + 1}. {m.title}</h2>
                <ul className="divide-y divide-clay-soft">
                  {m.classes.map((c) => (
                    <li key={c.class_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-lg font-medium">{c.title}</p>
                        <p className="text-muted">
                          {c.teacher_name ?? "Docente por asignar"} ·{" "}
                          {c.cycle_start ? (c.status === "pendiente" ? `Su ciclo inicia el ${formatDate(c.cycle_start)}` : `Ciclo desde el ${formatDate(c.cycle_start)}`) : "Fecha de inicio por definir"}
                        </p>
                      </div>
                      <span className={`rounded-full px-4 py-1 text-base font-medium ${PROGRESS_TONE[c.status]}`}>{PROGRESS_LABEL[c.status]}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <aside aria-labelledby="ciclos" className="h-fit rounded-3xl bg-clay-soft p-6 lg:sticky lg:top-6">
          <h2 id="ciclos" className="mb-3 text-xl font-bold">Cómo funcionan los ciclos</h2>
          <ul className="space-y-3 text-lg">
            <li>Cada docente dicta su asignatura en un <strong>ciclo</strong> con sus propias fechas. Por eso <strong>no verás las asignaturas en el orden del plan de estudios</strong>: es normal.</li>
            <li>Para graduarte debes <strong>aprobar todas las asignaturas</strong> asignadas a tu certificación.</li>
            <li>Antes de que empiece su ciclo, la asignatura figura como <em>pendiente por tomar</em>. Cuando empieza, pasa sola a <em>en curso</em>.</li>
            <li>Solo la docente de cada asignatura marca si la <em>aprobaste</em> o no. Si no la apruebas, podrás repetirla en el siguiente ciclo.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
