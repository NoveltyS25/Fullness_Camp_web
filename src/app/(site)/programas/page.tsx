import type { Metadata } from "next";
import { ProgramCard } from "@/components/ProgramCard";
import { isPurchasable, programs, type ProgramCategory } from "@/data/programs";
import { PAY_IN_FULL_PERCENT } from "@/lib/pricing";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fullnesscampinternacional.com";

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
  // Lista de cursos (carrusel) para Google: describe el catálogo completo.
  const courseList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: programs.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/programas/${p.slug}`,
      item: {
        "@type": "Course",
        name: p.title,
        description: p.summary,
        url: `${SITE}/programas/${p.slug}`,
        provider: { "@type": "EducationalOrganization", name: "Fullness Camp", url: SITE },
        ...(isPurchasable(p) && {
          offers: { "@type": "Offer", category: "Paid", price: Math.round(p.priceCOP * (1 - PAY_IN_FULL_PERCENT[p.category] / 100)), priceCurrency: "COP" },
        }),
      },
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseList).replace(/</g, "\\u003c") }} />
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
