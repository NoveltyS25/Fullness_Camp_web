import Link from "next/link";
import { redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { formatDate } from "@/lib/campus/time";
import { MODALITIES, type Modality } from "@/server/classes";
import { getCycleClasses, listCycles } from "@/server/cycles";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import { closeCycleAction, startCycleAction } from "../actions";

export const metadata = { title: "Mi ciclo" };

const field = "min-h-12 w-full rounded-xl border-2 border-clay-soft bg-white px-3 text-lg";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MiCiclo(props: PageProps<"/campus/profesor/ciclo">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) redirect("/campus");
  const q = await props.searchParams;
  const db = getDb();
  const cycles = await listCycles(db, user.id);
  const active = cycles.find((c) => c.status === "activo") ?? null;
  const classes = await getCycleClasses(db, user.id, active?.id ?? null);
  const error = one(q.error);

  const renderClass = (c: (typeof classes)[number]) => (
    <li key={c.id} className="rounded-2xl border border-clay-soft bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{c.title}</p>
          <p className="text-muted">
            {MODALITIES[c.modality as Modality] ?? c.modality} ·{" "}
            {c.lessons_total > 0 ? `${c.scheduled} de ${c.lessons_total} clases con fecha` : c.scheduled > 0 ? `${c.scheduled} horarios` : "Sin horarios"}
          </p>
          <p className="text-muted">
            {c.placements.length === 0
              ? "Aún no está en ningún certificado"
              : c.placements.map((p) => `${getProgram(p.program_slug)?.title ?? p.program_slug} · ${p.module_title}`).join(" — ")}
          </p>
        </div>
        <Link href={`/campus/profesor/clases/${c.id}`} className="btn btn-secondary">{c.scheduled > 0 ? "Ver y cambiar fechas" : "Poner fechas"}</Link>
      </div>
    </li>
  );

  const regular = classes.filter((c) => !c.is_event);
  const events = classes.filter((c) => c.is_event);

  return (
    <div className="space-y-10">
      <div>
        <p className="mb-4"><Link href="/campus/profesor" className="underline">← Mis clases</Link></p>
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Mi ciclo</h1>
        <p className="text-lg text-muted">
          Cada vez que empiezas a dar tus asignaturas, inicias un ciclo. Se llama como el mes y el año en que lo creas (por ejemplo, «Octubre 2027»). Las estudiantes ven
          las clases de tu ciclo activo; quienes ya aprobaron una asignatura no vuelven a ver sus horarios, y quienes no la aprobaron la ven de nuevo en el ciclo siguiente.
        </p>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-lg font-medium text-red-800">{error}</p>}
      {one(q.ok) && <p role="status" className="rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">✓ Listo.</p>}

      <section aria-labelledby="estado" className="rounded-3xl border-2 border-clay-dark bg-white p-6">
        {active ? (
          <>
            <h2 id="estado" className="mb-1 text-2xl font-bold">Ciclo activo: {active.name}</h2>
            <p className="mb-4 text-lg text-muted">Inicia el {formatDate(`${active.starts_on}T12:00:00-05:00`)}. Programa abajo las fechas y horas de cada clase.</p>
            <details className="mb-4 rounded-2xl bg-sand p-4">
              <summary className="cursor-pointer font-medium text-clay-dark underline">Iniciar un ciclo nuevo</summary>
              <p className="mt-2 text-muted">Se cerrará «{active.name}»: sus horarios dejarán de mostrarse a las estudiantes y empezarás desde cero.</p>
              <form action={startCycleAction} className="mt-3 flex flex-wrap items-end gap-3">
                <label>
                  <span className="mb-1 block font-medium">¿Cuándo inicia?</span>
                  <input name="starts_on" type="date" required className={field} />
                </label>
                <button type="submit" className="btn btn-secondary">Iniciar ciclo nuevo</button>
              </form>
            </details>
            <form action={closeCycleAction}>
              <input type="hidden" name="cycle_id" value={active.id} />
              <button type="submit" className="min-h-12 rounded-full px-4 font-medium text-clay-dark underline hover:bg-clay-soft">Cerrar este ciclo sin abrir otro</button>
            </form>
          </>
        ) : (
          <>
            <h2 id="estado" className="mb-1 text-2xl font-bold">Aún no tienes un ciclo activo</h2>
            <p className="mb-4 text-lg text-muted">Inicia tu ciclo para poder programar las clases de tus asignaturas.</p>
            <form action={startCycleAction} className="flex flex-wrap items-end gap-3">
              <label>
                <span className="mb-1 block text-lg font-medium">¿Cuándo inicia?</span>
                <input name="starts_on" type="date" required className={field} />
              </label>
              <button type="submit" className="btn btn-primary">Iniciar ciclo</button>
            </form>
          </>
        )}
      </section>

      <section aria-labelledby="asignaturas">
        <h2 id="asignaturas" className="mb-2 text-2xl font-bold">Mis asignaturas</h2>
        <p className="mb-4 text-muted">Cada asignatura se dicta una sola vez aunque esté en varios certificados: aquí ves en cuáles aparece y en qué módulo.</p>
        {regular.length === 0 ? (
          <p className="rounded-3xl border border-clay-soft bg-white p-6 text-lg">Aún no tienes asignaturas asignadas.</p>
        ) : (
          <ul className="space-y-3">{regular.map(renderClass)}</ul>
        )}
      </section>

      {events.length > 0 && (
        <section aria-labelledby="eventos">
          <h2 id="eventos" className="mb-2 text-2xl font-bold">Retiros y talleres presenciales</h2>
          <p className="mb-4 text-muted">Sus fechas las pones tú o la administración en cualquier momento; no dependen del ciclo.</p>
          <ul className="space-y-3">{events.map(renderClass)}</ul>
        </section>
      )}

      {cycles.length > 1 && (
        <section aria-labelledby="historial">
          <h2 id="historial" className="mb-3 text-xl font-bold">Ciclos anteriores</h2>
          <ul className="space-y-1 text-lg text-muted">
            {cycles.filter((c) => c.status === "cerrado").map((c) => <li key={c.id}>{c.name} · cerrado</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
