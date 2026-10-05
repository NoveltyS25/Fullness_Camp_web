import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { LeadForm } from "@/components/landing/LeadForm";
import { ProgramLanding } from "@/components/landing/ProgramLanding";
import { getLanding } from "@/data/landing";
import { getProgram, isPurchasable, programs } from "@/data/programs";
import { getMagazine } from "@/lib/magazine";
import { PAY_IN_FULL_PERCENT, formatCOP } from "@/lib/pricing";
import { whatsappLink } from "@/lib/whatsapp";
import { fetchGoogleReviews } from "@/server/google-reviews";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fullnesscampinternacional.com";

export function generateStaticParams() {
  return programs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/programas/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const program = getProgram(slug);
  if (!program) return {};
  const landing = getLanding(slug);
  const title = landing?.seo.title ?? program.title;
  const description = landing?.seo.description ?? program.summary;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/programas/${program.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/programas/${program.slug}`,
      locale: "es_CO",
      images: landing ? [{ url: landing.heroImage.src, alt: landing.heroImage.alt }] : undefined,
    },
  };
}

export default async function ProgramPage(props: PageProps<"/programas/[slug]">) {
  const { slug } = await props.params;
  const program = getProgram(slug);
  if (!program) notFound();

  const landing = getLanding(slug);
  const buyable = isPurchasable(program);
  const percent = PAY_IN_FULL_PERCENT[program.category];
  const url = `${SITE}/programas/${program.slug}`;

  // Datos estructurados: curso, ruta de navegación y preguntas frecuentes.
  const graph: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "Course",
      name: program.title,
      description: landing?.seo.description ?? program.summary,
      url,
      inLanguage: "es",
      provider: { "@type": "EducationalOrganization", name: "Fullness Camp", url: SITE },
      ...(buyable && {
        offers: {
          "@type": "Offer",
          category: "Paid",
          price: Math.round(program.priceCOP * (1 - percent / 100)),
          priceCurrency: "COP",
          availability: "https://schema.org/InStock",
          url,
        },
      }),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
        { "@type": "ListItem", position: 2, name: "Programas", item: `${SITE}/programas` },
        { "@type": "ListItem", position: 3, name: program.title, item: url },
      ],
    },
  ];
  if (landing?.faq.length) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: landing.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }
  const jsonLd = <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />;

  if (landing) {
    const googleReviews = await fetchGoogleReviews(); // null si no hay clave de Google: se usan las reseñas guardadas
    return (
      <main>
        <ProgramLanding program={program} landing={landing} magazine={landing.magazine ? getMagazine(slug) : null} googleReviews={googleReviews} />
        {jsonLd}
      </main>
    );
  }

  // Programas sin contenido detallado todavía: ficha sencilla con la misma captura de interesadas.
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <nav aria-label="Ruta" className="mb-6 text-muted">
        <Link href="/programas" className="underline">← Todos los programas</Link>
      </nav>
      <h1 className="mb-4 text-3xl font-bold sm:text-4xl">{program.title}</h1>
      {program.hours && <p className="mb-6 font-medium text-clay-dark">{program.hours} horas · Sedes Bogotá, Cajicá, Tabío y online</p>}
      <p className="mb-10 text-xl">{program.summary}</p>

      <section className="rounded-3xl border border-clay-soft bg-white p-6 sm:p-8" aria-label="Inscripción">
        {buyable ? (
          <>
            {percent > 0 && <p className="text-muted line-through">{formatCOP(program.priceCOP)}</p>}
            <p className="text-4xl font-bold text-clay-dark">{formatCOP(Math.round(program.priceCOP * (1 - percent / 100)))}</p>
            <p className="mb-6 text-muted">Pagando el valor completo online tienes {percent}% de descuento.</p>
            <AddToCartButton slug={program.slug} />
          </>
        ) : (
          <>
            <p className="mb-2 inline-block rounded-full bg-ink px-3 py-1 text-sm font-medium text-white">Próximamente</p>
            <p className="mb-6 text-lg">Estamos confirmando las próximas fechas y el valor. Déjanos tus datos y te avisamos.</p>
            <LeadForm slug={program.slug} interest="waitlist" submitLabel="Avísame cuando abra" id="aviso" />
            <p className="mt-6 text-lg">
              ¿Prefieres hablar con alguien?{" "}
              <a href={whatsappLink(`Hola, quisiera información sobre: ${program.title}`)} target="_blank" rel="noopener noreferrer" className="font-medium text-clay-dark underline">Escribe a una asesora</a>.
            </p>
          </>
        )}
      </section>
      {jsonLd}
    </main>
  );
}
