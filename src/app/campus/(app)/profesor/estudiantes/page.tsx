import Link from "next/link";
import { redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { getClassStudents, getTeacherClasses } from "@/server/classes";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Mis estudiantes" };

export default async function MisEstudiantes() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) redirect("/campus");
  const db = getDb();
  const classes = await getTeacherClasses(db, user.id);
  const withStudents = await Promise.all(classes.map(async (c) => ({ c, students: await getClassStudents(db, c.id) })));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Mis estudiantes</h1>
        <p className="text-lg text-muted">Las estudiantes de cada una de tus clases, con la certificación a la que pertenecen.</p>
      </div>
      {withStudents.length === 0 ? (
        <p className="rounded-3xl border border-clay-soft bg-white p-8 text-center text-xl">
          Aún no tienes clases. <Link href="/campus/profesor" className="font-medium text-clay-dark underline">Agrega la primera</Link>.
        </p>
      ) : (
        withStudents.map(({ c, students }) => (
          <section key={c.id} aria-labelledby={`c-${c.id}`}>
            <h2 id={`c-${c.id}`} className="mb-3 text-2xl font-bold text-clay-dark">
              <Link href={`/campus/profesor/clases/${c.id}`} className="no-underline hover:underline">{c.title}</Link> <span className="text-lg font-normal text-muted">({students.length})</span>
            </h2>
            {students.length === 0 ? (
              <p className="rounded-2xl border border-clay-soft bg-white p-4 text-muted">
                {c.programs.length === 0 ? "Esta clase aún no está en ninguna certificación." : "Todavía no hay estudiantes inscritas en sus certificaciones."}
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {students.map((s) => (
                  <li key={`${s.user_id}-${s.program_slug}`} className="flex items-center justify-between gap-3 rounded-2xl border border-clay-soft bg-white px-4 py-3">
                    <span className="font-medium">{s.full_name}</span>
                    <span className="rounded-full bg-clay-soft px-3 py-1 text-sm text-clay-dark">{getProgram(s.program_slug)?.title ?? s.program_slug}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
