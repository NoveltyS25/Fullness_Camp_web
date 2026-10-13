import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { getPensum, listTeachers, MODALITIES, type PensumTopic } from "@/server/curriculum";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import { addModuleAction, addTopicAction, assignTopicAction, deleteModuleAction, deleteTopicAction, unassignTopicAction } from "../actions";

export const metadata = { title: "Temas de la certificación" };

const field = "min-h-12 w-full rounded-xl border-2 border-clay-soft bg-white px-3 text-lg";
const small = "min-h-12 rounded-full px-4 font-medium text-clay-dark underline hover:bg-clay-soft";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function AssignForm({ slug, topic, userId, teachers, current }: { slug: string; topic: PensumTopic; userId?: string; teachers?: { id: string; full_name: string }[]; current?: PensumTopic["teachers"][number] }) {
  return (
    <form action={assignTopicAction} className="mt-3 grid gap-3 rounded-2xl bg-sand p-4 sm:grid-cols-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="topic_id" value={topic.id} />
      {userId && <input type="hidden" name="user_id" value={userId} />}
      {teachers && (
        <label className="sm:col-span-2">
          <span className="mb-1 block font-medium">Docente</span>
          <select name="user_id" required className={field}>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </label>
      )}
      <label>
        <span className="mb-1 block font-medium">Modalidad</span>
        <select name="modality" defaultValue={current?.modality ?? "virtual"} className={field}>
          {Object.entries(MODALITIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label>
        <span className="mb-1 block font-medium">Número de clases</span>
        <input name="classes_count" type="number" min={1} max={200} defaultValue={current?.classes_count ?? ""} className={field} />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block font-medium">Horario (texto libre)</span>
        <input name="schedule_note" defaultValue={current?.schedule_note ?? ""} placeholder="Ej.: lunes y martes de 6 a 8 p. m." className={field} />
      </label>
      <div className="sm:col-span-2"><button type="submit" className="btn btn-primary">Guardar</button></div>
    </form>
  );
}

export default async function EditorDeTemas(props: PageProps<"/campus/profesor/temas/[slug]">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) redirect("/campus");
  const { slug } = await props.params;
  const program = getProgram(slug);
  if (!program || program.category !== "certificacion") notFound();
  const q = await props.searchParams;
  const error = one(q.error);
  const isAdmin = user.role === "admin";

  const db = getDb();
  const [modules, teachers] = await Promise.all([getPensum(db, slug), isAdmin ? listTeachers(db) : Promise.resolve([])]);

  return (
    <>
      <p className="mb-4"><Link href="/campus/profesor/temas" className="underline">← Todas las certificaciones</Link></p>
      <h1 className="mb-2 text-3xl font-bold sm:text-4xl">{program.title}</h1>
      <p className="mb-6 text-lg text-muted">
        {isAdmin ? "Como administradora puedes agregar módulos y temas, y asignar a cualquier docente." : "Agrega o quita temas y asígnate los que vas a dictar, con su horario y modalidad."}
        {" "}Las estudiantes ven este plan en su campus.{" "}
        <Link href={`/campus/cursos/${slug}`} className="font-medium text-clay-dark underline">Ver como lo ve una estudiante</Link>
      </p>

      {error && <p role="alert" className="mb-6 rounded-2xl bg-red-50 p-4 text-lg font-medium text-red-800">{error}</p>}
      {one(q.ok) && <p role="status" className="mb-6 rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">✓ Guardado.</p>}

      <div className="space-y-10">
        {modules.map((m, mi) => (
          <section key={m.id} aria-labelledby={`m-${m.id}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id={`m-${m.id}`} className="text-2xl font-bold">Módulo {mi + 1}. {m.title}</h2>
              {isAdmin && (
                <form action={deleteModuleAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="module_id" value={m.id} />
                  <button type="submit" className={small}>Quitar módulo y sus temas</button>
                </form>
              )}
            </div>
            <ul className="space-y-3">
              {m.topics.map((t) => {
                const mine = t.teachers.find((x) => x.user_id === user.id);
                return (
                  <li key={t.id} className="rounded-2xl border border-clay-soft bg-white p-4">
                    <p className="text-lg font-bold">{t.title}</p>
                    {t.teachers.length === 0 ? (
                      <p className="text-muted">Docente por asignar</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {t.teachers.map((x) => (
                          <li key={x.user_id} className="text-lg">
                            <span className="font-medium">{x.full_name}</span> · {MODALITIES[x.modality]}
                            {x.classes_count ? ` · ${x.classes_count} ${x.classes_count === 1 ? "clase" : "clases"}` : ""}
                            {x.schedule_note ? ` · ${x.schedule_note}` : ""}
                            {isAdmin && x.user_id !== user.id && (
                              <form action={unassignTopicAction} className="inline">
                                <input type="hidden" name="slug" value={slug} />
                                <input type="hidden" name="topic_id" value={t.id} />
                                <input type="hidden" name="user_id" value={x.user_id} />
                                <button type="submit" className="ml-2 text-base underline">Quitar</button>
                              </form>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <details className="w-full">
                        <summary className="cursor-pointer font-medium text-clay-dark underline">
                          {mine ? "Editar mi horario y modalidad" : "Quiero dictar este tema"}
                        </summary>
                        <AssignForm slug={slug} topic={t} userId={user.id} current={mine} />
                      </details>
                      {isAdmin && (
                        <details className="w-full">
                          <summary className="cursor-pointer font-medium text-clay-dark underline">Asignar a otra docente</summary>
                          <AssignForm slug={slug} topic={t} teachers={teachers} />
                        </details>
                      )}
                      {mine && (
                        <form action={unassignTopicAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="topic_id" value={t.id} />
                          <button type="submit" className={small}>Dejar de dictar este tema</button>
                        </form>
                      )}
                      <form action={deleteTopicAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="topic_id" value={t.id} />
                        <button type="submit" className={small}>Quitar tema</button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>

            <form action={addTopicAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="module_id" value={m.id} />
              <label className="flex-1">
                <span className="sr-only">Nuevo tema para {m.title}</span>
                <input name="title" required minLength={2} placeholder="Agregar un tema a este módulo" className={field} />
              </label>
              <button type="submit" className="btn btn-secondary">Agregar tema</button>
            </form>
          </section>
        ))}

        {modules.length === 0 && <p className="rounded-3xl border border-clay-soft bg-white p-8 text-center text-xl">Esta certificación aún no tiene módulos.</p>}

        {isAdmin && (
          <form action={addModuleAction} className="flex flex-col gap-3 border-t border-clay-soft pt-8 sm:flex-row">
            <input type="hidden" name="slug" value={slug} />
            <label className="flex-1">
              <span className="mb-1 block text-lg font-medium">Nuevo módulo</span>
              <input name="title" required minLength={2} placeholder="Ej.: Anatomía aplicada" className={field} />
            </label>
            <button type="submit" className="btn btn-primary self-end">Agregar módulo</button>
          </form>
        )}
      </div>
    </>
  );
}
