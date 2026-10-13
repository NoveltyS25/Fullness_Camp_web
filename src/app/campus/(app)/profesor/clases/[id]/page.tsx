import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { formatDay, formatRange } from "@/lib/campus/time";
import { getClassSessions } from "@/server/campus";
import { CHOICE_LABEL, PROGRESS_LABEL, PROGRESS_TONE, TEACHER_CHOICES } from "@/lib/campus/progress";
import { getClassForActor, getClassLessons, getClassStudentsProgress, MODALITIES } from "@/server/classes";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import { addLessonAction, addSessionsAction, deleteClassAction, deleteLessonAction, scheduleLessonAction, setProgressAction, updateClassAction } from "../../actions";

export const metadata = { title: "Mi clase" };

const field = "min-h-12 w-full rounded-xl border-2 border-clay-soft bg-white px-3 text-lg";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MiClase(props: PageProps<"/campus/profesor/clases/[id]">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) redirect("/campus");
  const { id } = await props.params;
  const q = await props.searchParams;

  const db = getDb();
  const c = await getClassForActor(db, user, id);
  if (!c) notFound();
  const [sessions, students, lessons] = await Promise.all([getClassSessions(db, id, new Date().toISOString()), getClassStudentsProgress(db, id), getClassLessons(db, id)]);
  const error = one(q.error);

  return (
    <div className="space-y-12">
      <div>
        <p className="mb-4"><Link href="/campus/profesor" className="underline">← Mis clases</Link></p>
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">{c.title}</h1>
        <p className="text-lg text-muted">
          {MODALITIES[c.modality]} ·{" "}
          {c.programs.length === 0 ? "Aún no está en ninguna certificación." : `Está en: ${c.programs.map((p) => getProgram(p)?.title ?? p).join(" · ")}`}
        </p>
      </div>

      {one(q.nueva) && <p role="status" className="rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">✓ Clase creada. Ahora agrega sus horarios.</p>}
      {one(q.ok) && <p role="status" className="rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">✓ Guardado.</p>}
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-lg font-medium text-red-800">{error}</p>}

      <section aria-labelledby="temario">
        <h2 id="temario" className="mb-2 text-2xl font-bold">Temario y horarios de cada clase ({lessons.length})</h2>
        <p className="mb-4 text-muted">
          Cada clase del temario necesita su fecha y hora{c.modality !== "virtual" ? ", su lugar" : ""}{c.modality !== "presencial" ? " y su enlace de Meet" : ""}. Las estudiantes ven los temas y el horario en su calendario.
        </p>
        {lessons.length === 0 ? (
          <p className="rounded-3xl border border-clay-soft bg-white p-6 text-lg">Esta clase aún no tiene temario por encuentros. Puedes agregarlo abajo, o usar «Agregar horarios» si solo se repite cada semana.</p>
        ) : (
          <ul className="space-y-4">
            {lessons.map((l) => (
              <li key={l.id} className="rounded-3xl border border-clay-soft bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-xl font-bold text-clay-dark">{l.title}</h3>
                  {l.session_id && l.starts_at && l.ends_at ? (
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${l.status === "cancelled" ? "bg-red-50 text-red-900" : "bg-clay-soft text-clay-dark"}`}>
                      {l.status === "cancelled" ? "Cancelada" : "Con horario"}
                    </span>
                  ) : (
                    <span className="rounded-full border border-clay-dark px-3 py-1 text-sm font-medium text-clay-dark">Sin horario</span>
                  )}
                </div>
                {l.topics.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-6 text-muted">{l.topics.map((t) => <li key={t}>{t}</li>)}</ul>}

                {l.session_id && l.starts_at && l.ends_at ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand p-4">
                    <p className="text-lg font-medium">{formatDay(l.starts_at)}, {formatRange(l.starts_at, l.ends_at)}</p>
                    <Link href={`/campus/profesor/sesion/${l.session_id}`} className="btn btn-secondary">Cambiar horario</Link>
                  </div>
                ) : (
                  <form action={scheduleLessonAction} className="mt-4 grid gap-3 rounded-2xl bg-sand p-4 sm:grid-cols-2">
                    <input type="hidden" name="class_id" value={c.id} />
                    <input type="hidden" name="lesson_id" value={l.id} />
                    <label>
                      <span className="mb-1 block font-medium">Inicia</span>
                      <input name="starts_at" type="datetime-local" required className={field} />
                    </label>
                    <label>
                      <span className="mb-1 block font-medium">Termina</span>
                      <input name="ends_at" type="datetime-local" required className={field} />
                    </label>
                    {c.modality !== "virtual" && (
                      <label>
                        <span className="mb-1 block font-medium">Lugar</span>
                        <input name="location" required className={field} />
                      </label>
                    )}
                    {c.modality !== "presencial" && (
                      <label>
                        <span className="mb-1 block font-medium">Enlace (Meet)</span>
                        <input name="online_url" type="url" required placeholder="https://meet.google.com/…" className={field} />
                      </label>
                    )}
                    <div className="sm:col-span-2"><button type="submit" className="btn btn-primary">Poner horario a esta clase</button></div>
                  </form>
                )}

                <form action={deleteLessonAction} className="mt-2">
                  <input type="hidden" name="class_id" value={c.id} />
                  <input type="hidden" name="lesson_id" value={l.id} />
                  <button type="submit" className="min-h-12 rounded-full px-4 font-medium text-clay-dark underline hover:bg-clay-soft">Quitar esta clase del temario</button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4 max-w-2xl rounded-2xl bg-sand p-4">
          <summary className="cursor-pointer font-medium text-clay-dark underline">Agregar una clase al temario</summary>
          <form action={addLessonAction} className="mt-3 space-y-3">
            <input type="hidden" name="class_id" value={c.id} />
            <label className="block">
              <span className="mb-1 block font-medium">Título</span>
              <input name="title" required minLength={2} placeholder="Clase 9: …" className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block font-medium">Temas (uno por línea)</span>
              <textarea name="topics" rows={4} className="w-full rounded-xl border-2 border-clay-soft bg-white p-3 text-lg" />
            </label>
            <button type="submit" className="btn btn-primary">Agregar al temario</button>
          </form>
        </details>
      </section>

      <section aria-labelledby="horarios">
        <h2 id="horarios" className="mb-4 text-2xl font-bold">Horarios ({sessions.length})</h2>
        {sessions.length === 0 ? (
          <p className="rounded-3xl border border-clay-soft bg-white p-6 text-lg">Aún no hay horarios futuros. Agrégalos abajo.</p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${s.status === "cancelled" ? "border-red-200 bg-red-50" : "border-clay-soft bg-white"}`}>
                <div>
                  <p className={`text-lg font-bold ${s.status === "cancelled" ? "line-through" : ""}`}>{formatDay(s.starts_at)}</p>
                  <p className="text-muted">{formatRange(s.starts_at, s.ends_at)}{s.location ? ` · ${s.location}` : ""}{s.status === "cancelled" ? " · Cancelada" : ""}</p>
                </div>
                <Link href={`/campus/profesor/sesion/${s.id}`} className="btn btn-secondary">Cambiar horario</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="agregar" className="max-w-2xl">
        <h2 id="agregar" className="mb-4 text-2xl font-bold">Agregar horarios</h2>
        <form action={addSessionsAction} className="space-y-4">
          <input type="hidden" name="class_id" value={c.id} />
          <label className="block">
            <span className="mb-1 block text-lg font-medium">Título del encuentro <span className="font-normal text-muted">(opcional, por defecto el de la clase)</span></span>
            <input name="title" maxLength={160} className={field} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-lg font-medium">Primera clase inicia</span>
              <input name="starts_at" type="datetime-local" required className={field} />
            </label>
            <label>
              <span className="mb-1 block text-lg font-medium">Termina</span>
              <input name="ends_at" type="datetime-local" required className={field} />
            </label>
          </div>
          <p className="-mt-2 text-muted">Hora de Colombia.</p>
          <label className="block">
            <span className="mb-1 block text-lg font-medium">¿Cuántas semanas se repite?</span>
            <input name="weeks" type="number" min={1} max={40} defaultValue={1} className={field} />
            <span className="mt-1 block text-muted">1 = una sola clase. Con 8 se crean 8 clases, una por semana, a la misma hora.</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-lg font-medium">Lugar <span className="font-normal text-muted">(si es presencial)</span></span>
              <input name="location" className={field} />
            </label>
            <label>
              <span className="mb-1 block text-lg font-medium">Enlace en línea <span className="font-normal text-muted">(Meet)</span></span>
              <input name="online_url" type="url" className={field} />
            </label>
          </div>
          <button type="submit" className="btn btn-primary">Agregar horarios</button>
        </form>
      </section>

      <section aria-labelledby="estudiantes">
        <h2 id="estudiantes" className="mb-2 text-2xl font-bold">Estudiantes de esta clase ({students.length})</h2>
        <p className="mb-4 text-muted">
          Cuando empieza el ciclo de tu clase, cada estudiante pasa sola a «En curso». Tú decides si la <strong>aprueba</strong> o no: solo tú puedes cambiarlo, y ella lo ve en «Mi avance».
        </p>
        {students.length === 0 ? (
          <p className="rounded-3xl border border-clay-soft bg-white p-6 text-lg">Todavía no hay estudiantes: aparecerán cuando la clase esté en una certificación con inscritas.</p>
        ) : (
          <ul className="space-y-3">
            {students.map((s) => (
              <li key={`${s.user_id}-${s.program_slug}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clay-soft bg-white p-4">
                <div>
                  <p className="text-lg font-medium">{s.full_name}</p>
                  <span className="mt-1 inline-block rounded-full bg-clay-soft px-3 py-1 text-sm text-clay-dark">{getProgram(s.program_slug)?.title ?? s.program_slug}</span>
                </div>
                <form action={setProgressAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="class_id" value={c.id} />
                  <input type="hidden" name="user_id" value={s.user_id} />
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${PROGRESS_TONE[s.status]}`}>{PROGRESS_LABEL[s.status]}</span>
                  <label>
                    <span className="sr-only">Estado de {s.full_name}</span>
                    <select name="status" defaultValue={s.decided ? s.status : "automatico"} className={field}>
                      {TEACHER_CHOICES.map((v) => <option key={v} value={v}>{CHOICE_LABEL[v]}</option>)}
                    </select>
                  </label>
                  <button type="submit" className="btn btn-secondary">Guardar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="editar" className="max-w-2xl border-t border-clay-soft pt-8">
        <h2 id="editar" className="mb-4 text-2xl font-bold">Datos de la clase</h2>
        <form action={updateClassAction} className="space-y-4">
          <input type="hidden" name="class_id" value={c.id} />
          <label className="block">
            <span className="mb-1 block text-lg font-medium">Nombre</span>
            <input name="title" required defaultValue={c.title} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-lg font-medium">Modalidad</span>
            <select name="modality" defaultValue={c.modality} className={field}>
              {Object.entries(MODALITIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-lg font-medium">Descripción</span>
            <textarea name="description" rows={3} defaultValue={c.description ?? ""} className="w-full rounded-xl border-2 border-clay-soft bg-white p-3 text-lg" />
          </label>
          <button type="submit" className="btn btn-primary">Guardar</button>
        </form>
        <form action={deleteClassAction} className="mt-6">
          <input type="hidden" name="class_id" value={c.id} />
          <button type="submit" className="min-h-12 rounded-full px-4 font-medium text-red-800 underline hover:bg-red-50">Borrar esta clase y sus horarios</button>
        </form>
      </section>
    </div>
  );
}
