import Link from "next/link";
import { redirect } from "next/navigation";
import { programs } from "@/data/programs";
import { getTeacherPrograms, programsWithPensum } from "@/server/curriculum";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Temas por certificación" };

export default async function TemasPorCertificacion(props: PageProps<"/campus/profesor/temas">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) redirect("/campus");
  const db = getDb();
  const withPensum = await programsWithPensum(db);
  const mine = new Set(await getTeacherPrograms(db, user.id));
  // Primero las certificaciones en las que la docente dicta.
  const certs = programs.filter((p) => p.category === "certificacion").sort((a, b) => Number(mine.has(b.slug)) - Number(mine.has(a.slug)));
  const q = await props.searchParams;

  return (
    <>
      <p className="mb-4"><Link href="/campus/profesor" className="underline">← Mis clases</Link></p>
      {q.bienvenida && <p role="status" className="mb-6 rounded-2xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">✓ Listo, quedó guardado tu registro. Ahora entra a cada certificación para asignarte tus temas, horarios y modalidad.</p>}
      <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Temas por certificación</h1>
      <p className="mb-8 text-lg text-muted">
        Elige una certificación para ver sus módulos y temas, agregar o quitar temas, y asignarte los que vas a dictar con su horario y modalidad.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {certs.map((p) => (
          <li key={p.slug}>
            <Link href={`/campus/profesor/temas/${p.slug}`} className="block h-full rounded-3xl border border-clay-soft bg-white p-5 no-underline hover:border-clay-dark">
              <span className="text-xl font-bold text-clay-dark">{p.title}</span>
              <span className="mt-2 block text-muted">
                {mine.has(p.slug) ? "Eres docente aquí · " : ""}{withPensum.has(p.slug) ? "Con módulos y temas" : user.role === "admin" ? "Aún sin módulos: créalos aquí" : "Aún sin módulos"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
