import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActionForm, inputClass } from "@/components/campus/ActionForm";
import { programs } from "@/data/programs";
import { getCohort, listCohortEnrollments } from "@/server/campus";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import { enrollManualAction, setCohortActiveAction, setCourseCompletedAction, setEnrollmentStatusAction } from "../../actions";

export const metadata = { title: "Cohorte" };

const statusLabel = { active: "Activa", paused: "Pausada", cancelled: "Cancelada" } as const;

export default async function CohortePage(props: PageProps<"/campus/admin/cohortes/[id]">) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/campus");
  const { id } = await props.params;

  const db = getDb();
  const cohort = await getCohort(db, id);
  if (!cohort) notFound();
  const enrollments = await listCohortEnrollments(db, id);

  return (
    <div className="space-y-12">
      <div>
        <p className="mb-4"><Link href="/campus/admin" className="underline">← Administración</Link></p>
        <h1 className="mb-1 text-3xl font-bold">{cohort.name}</h1>
        <p className="text-lg text-muted">
          {cohort.sede} · {programs.find((p) => p.slug === cohort.program_slug)?.title ?? cohort.program_slug}
        </p>
        <form action={setCohortActiveAction} className="mt-4">
          <input type="hidden" name="cohort_id" value={cohort.id} />
          <input type="hidden" name="active" value={String(!cohort.active)} />
          <button type="submit" className="btn btn-secondary">{cohort.active ? "Marcar como inactiva" : "Volver a activar"}</button>
        </form>
      </div>

      <section aria-labelledby="estudiantes">
        <h2 id="estudiantes" className="mb-4 text-2xl font-bold">Estudiantes ({enrollments.length})</h2>
        <ul className="mb-8 space-y-3">
          {enrollments.map((e) => (
            <li key={e.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clay-soft bg-white p-4">
              <div>
                <p className="text-lg font-bold">{e.full_name}</p>
                <p className="text-muted">Cédula {e.cedula} · {e.email}{e.whatsapp_phone ? ` · WhatsApp ${e.whatsapp_phone}` : ""}</p>
                <p className="text-sm font-medium text-clay-dark">{statusLabel[e.status]}{e.completed_at ? " · Curso terminado (certificado emitido)" : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {e.status === "active" && (
                  <form action={setCourseCompletedAction}>
                    <input type="hidden" name="cohort_id" value={cohort.id} />
                    <input type="hidden" name="enrollment_id" value={e.enrollment_id} />
                    <input type="hidden" name="completed" value={e.completed_at ? "false" : "true"} />
                    <button type="submit" className="min-h-12 rounded-full bg-clay-soft px-4 font-medium text-clay-dark hover:bg-clay hover:text-white">
                      {e.completed_at ? "Reabrir curso" : "Marcar curso terminado"}
                    </button>
                  </form>
                )}
                {(["active", "paused", "cancelled"] as const).filter((s) => s !== e.status).map((s) => (
                  <form key={s} action={setEnrollmentStatusAction}>
                    <input type="hidden" name="cohort_id" value={cohort.id} />
                    <input type="hidden" name="user_id" value={e.user_id} />
                    <input type="hidden" name="status" value={s} />
                    <button type="submit" className="min-h-12 rounded-full px-4 text-clay-dark underline hover:bg-clay-soft">{statusLabel[s]}</button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="max-w-2xl">
          <h3 className="mb-3 text-xl font-bold">Inscribir manualmente</h3>
          <p className="mb-4 text-muted">Por ejemplo, un pago por transferencia. Si la cédula no tiene cuenta, escribe también el nombre y el correo: se crea la cuenta y se le envía el paso a paso.</p>
          <ActionForm action={enrollManualAction} submitLabel="Inscribir">
            <input type="hidden" name="cohort_id" value={cohort.id} />
            <div>
              <label htmlFor="m_cedula" className="mb-2 block text-lg font-medium">Cédula</label>
              <input id="m_cedula" name="cedula" inputMode="numeric" required className={inputClass} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="m_name" className="mb-2 block text-lg font-medium">Nombre (solo si no tiene cuenta)</label>
                <input id="m_name" name="full_name" className={inputClass} />
              </div>
              <div>
                <label htmlFor="m_email" className="mb-2 block text-lg font-medium">Correo (solo si no tiene cuenta)</label>
                <input id="m_email" name="email" type="email" className={inputClass} />
              </div>
            </div>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
