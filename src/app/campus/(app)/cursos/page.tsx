import Link from "next/link";
import { redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { canAccessCampus, getEntitlements, type Entitlement } from "@/server/campus";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Mis cursos" };

const day = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "long" });

function CourseCard({ e, done }: { e: Entitlement; done: boolean }) {
  const title = getProgram(e.program_slug)?.title ?? e.program_slug;
  return (
    <li className="rounded-3xl border border-clay-soft bg-white p-5">
      <h3 className="text-xl font-bold text-clay-dark">{title}</h3>
      {e.cohort_name ? (
        <p className="mt-2 text-muted">Grupo: {e.cohort_name} · {e.sede}</p>
      ) : (
        !done && <p className="mt-2 text-muted">Pago confirmado ✓ Te asignaremos grupo y horario muy pronto.</p>
      )}
      {done && e.completed_at && <p className="mt-2 text-muted">Terminado el {day.format(new Date(e.completed_at))}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/campus/cursos/${e.program_slug}`} className="btn btn-secondary">Ver plan de estudios</Link>
        {done && e.certificate_code && <Link href={`/campus/certificado/${e.enrollment_id}`} className="btn btn-primary">Ver mi certificado</Link>}
      </div>
    </li>
  );
}

export default async function MisCursos() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  const entitlements = await getEntitlements(getDb(), user.id);
  if (!canAccessCampus(user, entitlements)) redirect("/campus");

  const active = entitlements.filter((e) => !e.completed_at);
  const finished = entitlements.filter((e) => e.completed_at);

  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-bold sm:text-4xl">Mis cursos</h1>

      <section aria-labelledby="activos">
        <h2 id="activos" className="mb-4 text-2xl font-bold">Mis cursos activos</h2>
        {active.length === 0 ? (
          <p className="rounded-3xl border border-clay-soft bg-white p-6 text-lg">No tienes cursos activos en este momento.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">{active.map((e) => <CourseCard key={e.enrollment_id} e={e} done={false} />)}</ul>
        )}
      </section>

      <section aria-labelledby="terminados">
        <h2 id="terminados" className="mb-4 text-2xl font-bold">Mis cursos terminados</h2>
        {finished.length === 0 ? (
          <p className="rounded-3xl border border-clay-soft bg-white p-6 text-lg">
            Aquí aparecerán tus cursos terminados con tu certificado virtual, cuando la escuela confirme que completaste todo, incluida la tesina.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">{finished.map((e) => <CourseCard key={e.enrollment_id} e={e} done />)}</ul>
        )}
      </section>
    </div>
  );
}
