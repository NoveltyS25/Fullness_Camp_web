import Link from "next/link";
import { redirect } from "next/navigation";
import { programs } from "@/data/programs";
import { programsWithPensum } from "@/server/classes";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Certificaciones" };

export default async function Certificaciones() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/campus");
  const withPensum = await programsWithPensum(getDb());
  const certs = programs.filter((p) => p.category === "certificacion");

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Certificaciones</h1>
      <p className="mb-8 text-lg text-muted">
        Elige una certificación para armar su plan de estudios: sus módulos y las clases que tiene cada uno. Las docentes definen sus propias clases y horarios; tú decides en qué certificación va cada una.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {certs.map((p) => (
          <li key={p.slug}>
            <Link href={`/campus/admin/certificaciones/${p.slug}`} className="block h-full rounded-3xl border border-clay-soft bg-white p-5 no-underline hover:border-clay-dark">
              <span className="text-xl font-bold text-clay-dark">{p.title}</span>
              <span className="mt-2 block text-muted">{withPensum.has(p.slug) ? "Con plan de estudios" : "Aún sin módulos: créalos aquí"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
