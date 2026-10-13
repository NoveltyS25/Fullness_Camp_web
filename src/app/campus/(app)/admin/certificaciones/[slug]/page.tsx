import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { getPensum, listClasses, listTeachers, MODALITIES } from "@/server/classes";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import { addModuleAction, createAndPlaceClassAction, deleteModuleAction, placeClassAction, unplaceClassAction } from "../actions";

export const metadata = { title: "Armar certificación" };

const field = "min-h-12 w-full rounded-xl border-2 border-clay-soft bg-white px-3 text-lg";
const small = "min-h-12 rounded-full px-4 font-medium text-clay-dark underline hover:bg-clay-soft";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ArmarCertificacion(props: PageProps<"/campus/admin/certificaciones/[slug]">) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/campus");
  const { slug } = await props.params;
  const program = getProgram(slug);
  if (!program || program.category !== "certificacion") notFound();
  const q = await props.searchParams;

  const db = getDb();
  const [modules, allClasses, teachers] = await Promise.all([getPensum(db, slug), listClasses(db), listTeachers(db)]);
  const error = one(q.error);

  return (
    <div className="space-y-10">
      <div>
        <p className="mb-4"><Link href="/campus/admin/certificaciones" className="underline">← Todas las certificaciones</Link></p>
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">{program.title}</h1>
        <p className="text-lg text-muted">
          Arma el plan de estudios: módulos y las clases de cada uno.{" "}
          <Link href={`/campus/cursos/${slug}`} className="font-medium text-clay-dark underline">Ver como lo ve una estudiante</Link>
        </p>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-lg font-medium text-red-800">{error}</p>}
      {one(q.ok) && <p role="status" className="rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">✓ Guardado.</p>}

      {modules.map((m, mi) => {
        const inModule = new Set(m.classes.map((c) => c.class_id));
        const available = allClasses.filter((c) => !inModule.has(c.id));
        return (
          <section key={m.id} aria-labelledby={`m-${m.id}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id={`m-${m.id}`} className="text-2xl font-bold">Módulo {mi + 1}. {m.title}</h2>
              <form action={deleteModuleAction}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="module_id" value={m.id} />
                <button type="submit" className={small}>Quitar módulo</button>
              </form>
            </div>

            {m.classes.length === 0 ? (
              <p className="rounded-2xl border border-clay-soft bg-white p-4 text-muted">Este módulo aún no tiene clases.</p>
            ) : (
              <ul className="space-y-3">
                {m.classes.map((c) => (
                  <li key={c.placement_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clay-soft bg-white p-4">
                    <div>
                      <p className="text-lg font-bold">{c.title}</p>
                      <p className="text-muted">
                        {c.teacher_name ?? "Sin docente: asígnala en «Clases y docentes»"} · {MODALITIES[c.modality]} · {c.upcoming_count} {c.upcoming_count === 1 ? "clase programada" : "clases programadas"}
                      </p>
                    </div>
                    <form action={unplaceClassAction}>
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="placement_id" value={c.placement_id} />
                      <button type="submit" className={small}>Sacar de esta certificación</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <details className="rounded-2xl bg-sand p-4">
                <summary className="cursor-pointer font-medium text-clay-dark underline">Agregar una clase que ya existe</summary>
                <form action={placeClassAction} className="mt-3 space-y-3">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="module_id" value={m.id} />
                  <label className="block">
                    <span className="mb-1 block font-medium">Clase</span>
                    <select name="class_id" required className={field} disabled={available.length === 0}>
                      {available.map((c) => <option key={c.id} value={c.id}>{c.title} — {c.teacher_name ?? "sin docente"}</option>)}
                    </select>
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={available.length === 0}>Agregar al módulo</button>
                </form>
              </details>
              <details className="rounded-2xl bg-sand p-4">
                <summary className="cursor-pointer font-medium text-clay-dark underline">Crear una clase nueva aquí</summary>
                <form action={createAndPlaceClassAction} className="mt-3 space-y-3">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="module_id" value={m.id} />
                  <label className="block">
                    <span className="mb-1 block font-medium">Nombre de la clase</span>
                    <input name="title" required minLength={2} className={field} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-medium">Docente</span>
                    <select name="teacher_id" defaultValue="" className={field}>
                      <option value="">Sin docente por ahora</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-medium">Modalidad</span>
                    <select name="modality" defaultValue="virtual" className={field}>
                      {Object.entries(MODALITIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <button type="submit" className="btn btn-primary">Crear y agregar</button>
                </form>
              </details>
            </div>
          </section>
        );
      })}

      <form action={addModuleAction} className="flex flex-col gap-3 border-t border-clay-soft pt-8 sm:flex-row">
        <input type="hidden" name="slug" value={slug} />
        <label className="flex-1">
          <span className="mb-1 block text-lg font-medium">Nuevo módulo</span>
          <input name="title" required minLength={2} placeholder="Ej.: Anatomía aplicada" className={field} />
        </label>
        <button type="submit" className="btn btn-primary self-end">Agregar módulo</button>
      </form>
    </div>
  );
}
