import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { getProgram, isPurchasable, programs } from "@/data/programs";
import { PAY_IN_FULL_PERCENT, formatCOP } from "@/lib/pricing";
import { whatsappLink } from "@/lib/whatsapp";

export function generateStaticParams() {
  return programs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/programas/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const program = getProgram(slug);
  if (!program) return {};
  return {
    title: program.title,
    description: program.summary,
    alternates: { canonical: `/programas/${program.slug}` },
  };
}

export default async function ProgramPage(props: PageProps<"/programas/[slug]">) {
  const { slug } = await props.params;
  const program = getProgram(slug);
  if (!program) notFound();

  const buyable = isPurchasable(program);
  const percent = PAY_IN_FULL_PERCENT[program.category];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: program.title,
    description: program.summary,
    provider: { "@type": "EducationalOrganization", name: "Fullness Camp", url: "https://fullnesscampinternacional.com" },
    ...(buyable && {
      offers: { "@type": "Offer", price: program.priceCOP, priceCurrency: "COP", availability: "https://schema.org/InStock" },
    }),
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <nav aria-label="Ruta" className="mb-6 text-muted">
        <Link href="/programas" className="underline">← Todos los programas</Link>
      </nav>

      <h1 className="mb-4 text-3xl font-bold sm:text-4xl">{program.title}</h1>
      {program.hours && <p className="mb-6 font-medium text-clay-dark">{program.hours} horas · Sedes Bogotá, Cajicá, Tabío y online</p>}
      <p className="mb-10 text-xl">{program.summary}</p>

      <section className="rounded-3xl border border-clay-soft bg-white p-6 sm:p-8" aria-label="Precio e inscripción">
        {buyable ? (
          <>
            {percent > 0 && <p className="text-muted line-through">{formatCOP(program.priceCOP)}</p>}
            <p className="text-4xl font-bold text-clay-dark">{formatCOP(Math.round(program.priceCOP * (1 - percent / 100)))}</p>
            <p className="mb-6 text-muted">
              {percent > 0 ? `Pagando el valor completo online tienes ${percent}% de descuento.` : "Valor del programa."}
              {program.priceNote ? ` Valor ${program.priceNote}.` : ""} Puedes pagar con tarjeta de crédito y diferir las cuotas con tu banco.
            </p>
            <AddToCartButton slug={program.slug} />
          </>
        ) : (
          <>
            <p className="mb-2 inline-block rounded-full bg-ink px-3 py-1 text-sm font-medium text-white">Próximamente</p>
            <p className="mb-6 text-lg">Estamos confirmando las próximas fechas y el valor. Escríbenos y te avisamos.</p>
            <a
              href={whatsappLink(`Hola, quisiera información sobre: ${program.title}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Preguntar a una asesora
            </a>
          </>
        )}
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </main>
  );
}
