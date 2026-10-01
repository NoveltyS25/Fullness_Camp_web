import type { Metadata } from "next";
import { ProgramCard } from "@/components/ProgramCard";
import { programs, type ProgramCategory } from "@/data/programs";

export const metadata: Metadata = {
  title: "Programas y certificaciones de yoga",
  description:
    "Certificaciones de formación de instructores de yoga, talleres y retiros en Bogotá, Cajicá, Tabío y online. Escuela registrada RYS 200 en Yoga Alliance.",
  alternates: { canonical: "/programas" },
};

const groups: { category: ProgramCategory; title: string }[] = [
  { category: "certificacion", title: "Certificaciones" },
  { category: "taller", title: "Talleres" },
  { category: "retiro", title: "Retiros" },
  { category: "clases", title: "Clases" },
];

export default function Programas() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="mb-4 text-4xl font-bold">Programas</h1>
      <p className="mb-12 max-w-2xl text-lg text-muted">Elige tu formación. Si tienes dudas, una asesora te acompaña por WhatsApp.</p>

      {groups.map(({ category, title }) => {
        const list = programs.filter((p) => p.category === category);
        if (!list.length) return null;
        return (
          <section key={category} className="mb-14" aria-labelledby={`g-${category}`}>
            <h2 id={`g-${category}`} className="mb-6 text-2xl font-bold">{title}</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => <ProgramCard key={p.slug} program={p} />)}
            </div>
          </section>
        );
      })}
    </main>
  );
}
