import Link from "next/link";
import { redirect } from "next/navigation";
import { programs } from "@/data/programs";
import { programsWithPensum } from "@/server/curriculum";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Temas por certificación" };

export default async function TemasPorCertificacion() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) redirect("/campus");
  const withPensum = await programsWithPensum(getDb());
  const certs = programs.filter((p) => p.category === "certificacion");

  return (
    <>
      <p className="mb-4"><Link href="/campus/profesor" className="underline">← Mis clases</Link></p>
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
                {withPensum.has(p.slug) ? "Con módulos y temas" : user.role === "admin" ? "Aún sin módulos: créalos aquí" : "Aún sin módulos"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
