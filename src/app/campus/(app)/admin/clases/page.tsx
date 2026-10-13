import Link from "next/link";
import { redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { listClasses, listTeachers, MODALITIES } from "@/server/classes";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import { deleteClassAdminAction, setClassTeacherAction } from "../certificaciones/actions";

export const metadata = { title: "Clases y docentes" };

const field = "min-h-12 rounded-xl border-2 border-clay-soft bg-white px-3 text-lg";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ClasesYDocentes(props: PageProps<"/campus/admin/clases">) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/campus");
  const q = await props.searchParams;
  const db = getDb();
  const [classes, teachers] = await Promise.all([listClasses(db), listTeachers(db)]);
  const error = one(q.error);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Clases y docentes</h1>
        <p className="text-lg text-muted">
          Todas las clases, quién las dicta y en qué certificaciones están. Las docentes crean sus clases y horarios; aquí puedes asignar o cambiar la docente.
          Para poner una clase en una certificación, entra a <Link href="/campus/admin/certificaciones" className="font-medium text-clay-dark underline">Certificaciones</Link>.
        </p>
      </div>
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-lg font-medium text-red-800">{error}</p>}
      {one(q.ok) && <p role="status" className="rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">✓ Guardado.</p>}

      {classes.length === 0 ? (
        <p className="rounded-3xl border border-clay-soft bg-white p-8 text-center text-xl">Aún no hay clases.</p>
      ) : (
        <ul className="space-y-3">
          {classes.map((c) => (
            <li key={c.id} className="rounded-2xl border border-clay-soft bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{c.title}</p>
                  <p className="text-muted">
                    {MODALITIES[c.modality]} · {c.upcoming_count} {c.upcoming_count === 1 ? "clase programada" : "clases programadas"}
                  </p>
                  <p className="text-muted">
                    {c.programs.length === 0 ? "No está en ninguna certificación" : `En: ${c.programs.map((p) => getProgram(p)?.title ?? p).join(" · ")}`}
                  </p>
                </div>
                <form action={setClassTeacherAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="class_id" value={c.id} />
                  <label>
                    <span className="sr-only">Docente de {c.title}</span>
                    <select name="teacher_id" defaultValue={c.teacher_id ?? ""} className={field}>
                      <option value="">Sin docente</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </label>
                  <button type="submit" className="btn btn-secondary">Guardar</button>
                </form>
              </div>
              <form action={deleteClassAdminAction} className="mt-2">
                <input type="hidden" name="class_id" value={c.id} />
                <button type="submit" className="min-h-12 rounded-full px-4 font-medium text-red-800 underline hover:bg-red-50">Borrar clase y sus horarios</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
