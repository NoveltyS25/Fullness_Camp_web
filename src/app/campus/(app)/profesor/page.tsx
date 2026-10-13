import Link from "next/link";
import { redirect } from "next/navigation";
import { MonthCalendar } from "@/components/campus/MonthCalendar";
import { NewClassForm } from "@/components/campus/NewClassForm";
import { currentMonth, monthRangeIso, parseMonth } from "@/lib/campus/calendar";
import { getTeacherSessionsBetween } from "@/server/campus";
import { getTeacherClasses, MODALITIES } from "@/server/classes";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Mis clases" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MisClases(props: PageProps<"/campus/profesor">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) redirect("/campus");
  const q = await props.searchParams;

  const { year, month } = parseMonth(one(q.mes)) ?? currentMonth();
  const range = monthRangeIso(year, month);
  const db = getDb();
  const [sessions, classes] = await Promise.all([getTeacherSessionsBetween(db, user.id, range.from, range.to), getTeacherClasses(db, user.id)]);

  const notified = one(q.guardado) === undefined ? null : Number(one(q.guardado));
  const error = one(q.error);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Mis clases</h1>
        <p className="text-lg text-muted">
          Aquí ves tus horarios del mes. Toca una clase para cambiar su día u hora: tus estudiantes reciben el aviso automáticamente.
        </p>
      </div>

      {one(q.bienvenida) && (
        <p role="status" className="rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">
          ✓ Listo, quedó guardado tu registro. Tu primer paso: agrega abajo las clases que dictas y sus horarios.
        </p>
      )}
      {one(q.nueva) && (
        <p role="status" className="rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">
          ✓ Clase creada. Ya aparece en tu calendario; puedes agregar más horarios entrando a la clase.
        </p>
      )}
      {notified !== null && !Number.isNaN(notified) && (
        <p role="status" className="rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">
          ✓ Cambio guardado.{" "}
          {notified === 0
            ? "No había estudiantes inscritas o no hubo cambios que avisar."
            : `Avisamos a ${notified} ${notified === 1 ? "estudiante" : "estudiantes"} en el campus, y por correo o WhatsApp según sus preferencias.`}
        </p>
      )}
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-lg font-medium text-red-800">{error}</p>}

      <MonthCalendar year={year} month={month} sessions={sessions} basePath="/campus/profesor" />

      <section aria-labelledby="lista">
        <h2 id="lista" className="mb-4 text-2xl font-bold">Las clases que dicto</h2>
        {classes.length === 0 ? (
          <p className="rounded-3xl border border-clay-soft bg-white p-6 text-lg">Aún no has agregado clases. Agrega la primera abajo.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {classes.map((c) => (
              <li key={c.id}>
                <Link href={`/campus/profesor/clases/${c.id}`} className="block h-full rounded-3xl border border-clay-soft bg-white p-5 no-underline hover:border-clay-dark">
                  <span className="text-xl font-bold text-clay-dark">{c.title}</span>
                  <span className="mt-1 block text-muted">{MODALITIES[c.modality]} · {c.upcoming_count === 0 ? "Sin horarios: entra y agrégalos" : `${c.upcoming_count} ${c.upcoming_count === 1 ? "clase programada" : "clases programadas"}`}</span>
                  <span className="mt-1 block text-muted">
                    {c.programs.length === 0 ? "Aún no está en ninguna certificación" : `En ${c.programs.length} ${c.programs.length === 1 ? "certificación" : "certificaciones"}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="nueva" className="max-w-2xl">
        <h2 id="nueva" className="mb-2 text-2xl font-bold">Agregar una clase</h2>
        <p className="mb-4 text-muted">Escribe lo que dictas (por ejemplo, «Marketing») y su primer horario: aparecerá de inmediato en tu calendario. La administración la coloca en las certificaciones que corresponda.</p>
        <NewClassForm />
      </section>
    </div>
  );
}
