import Image from "next/image";
import type { Landing } from "@/data/landing";
import { isPurchasable, type Program } from "@/data/programs";
import { itemParams } from "@/lib/analytics";
import type { MagazineManifest } from "@/lib/magazine";
import type { GoogleReviewsData } from "@/server/google-reviews";
import { PAY_IN_FULL_PERCENT, formatCOP } from "@/lib/pricing";
import { whatsappLink } from "@/lib/whatsapp";
import { BuyNowButton } from "./BuyNowButton";
import { LeadForm } from "./LeadForm";
import { MagazineViewer } from "./MagazineViewer";
import { FactGlyph } from "./FactGlyph";
import { StickyCta } from "./StickyCta";
import { TrackEvent } from "./TrackEvent";

const Check = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" className="mt-0.5 shrink-0 text-clay-dark" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" className="fill-clay-soft stroke-none" />
    <path d="m7.5 12.5 3 3 6-6.5" />
  </svg>
);

function Section({ id, tone = "sand", children, label }: { id?: string; tone?: "sand" | "soft" | "white"; children: React.ReactNode; label: string }) {
  const bg = tone === "soft" ? "bg-clay-soft" : tone === "white" ? "bg-white" : "bg-sand";
  return (
    <section id={id} aria-labelledby={`${id ?? label}-t`} className={`${bg} scroll-mt-20 py-14 sm:py-20`}>
      <div className="mx-auto max-w-6xl px-5">{children}</div>
    </section>
  );
}

const H2 = ({ id, children, center = false, sub }: { id: string; children: React.ReactNode; center?: boolean; sub?: string }) => (
  <div className={`mb-10 ${center ? "mx-auto max-w-2xl text-center" : ""}`}>
    <h2 id={`${id}-t`} className="text-3xl font-bold sm:text-4xl">{children}</h2>
    {sub && <p className="mt-3 text-lg text-muted">{sub}</p>}
  </div>
);

const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex gap-0.5 text-clay-dark" role="img" aria-label={`${n} de 5 estrellas`}>
    {Array.from({ length: 5 }, (_, i) => (
      <svg key={i} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className={i < Math.round(n) ? "fill-current" : "fill-clay-soft"}>
        <path d="m12 2.8 2.8 5.9 6.4.9-4.6 4.5 1.1 6.4L12 17.4l-5.7 3.1 1.1-6.4L2.8 9.6l6.4-.9L12 2.8Z" />
      </svg>
    ))}
  </span>
);

export function ProgramLanding({ program, landing, magazine, googleReviews }: { program: Program; landing: Landing; magazine: MagazineManifest | null; googleReviews: GoogleReviewsData | null }) {
  const buyable = isPurchasable(program);
  const percent = PAY_IN_FULL_PERCENT[program.category];
  const list = program.priceCOP ?? 0;
  const final = Math.round(list * (1 - percent / 100));
  const saving = list - final;
  const advisor = whatsappLink(`Hola, quisiera información sobre: ${program.title}`);
  const buy = (where: "hero" | "pricing" | "sticky" | "final", className?: string, label?: string) => (
    <BuyNowButton slug={program.slug} title={program.title} price={final} category={program.category} where={where} className={className} label={label} />
  );

  return (
    <>
      <TrackEvent event="view_item" params={itemParams({ slug: program.slug, title: program.title, price: buyable ? final : null, category: program.category })} />

      {/* 1. Portada: promesa clara, prueba de confianza y un solo botón principal */}
      <section className="bg-sand" aria-labelledby="hero-t">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-8 sm:py-12 md:grid-cols-[1.25fr_0.75fr] md:gap-12">
          <div className="space-y-5">
            <p className="font-medium tracking-wide text-clay-dark">{landing.kicker}</p>
            <h1 id="hero-t" className="text-3xl font-bold sm:text-4xl lg:text-[2.75rem] lg:leading-tight">{landing.headline}</h1>
            <p className="text-lg text-muted sm:text-xl">{landing.subheadline}</p>

            <div className="space-y-3">
              {buyable ? (
                <>
                  <p className="text-lg">
                    <span className="text-3xl font-bold text-clay-dark">{formatCOP(final)}</span>{" "}
                    <span className="text-muted">pagando completo{percent > 0 ? ` (${percent}% de descuento)` : ""}{program.priceNote ? ` · ${program.priceNote}` : ""}</span>
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {buy("hero", "btn btn-primary !min-h-16 !px-10 text-xl")}
                    <a href={advisor} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Hablar con una asesora</a>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <a href="#avisame" className="btn btn-primary !min-h-16 !px-10 text-xl">Avísame cuando abra</a>
                  <a href={advisor} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Hablar con una asesora</a>
                </div>
              )}
            </div>

            <ul className="space-y-2 pt-1">
              {landing.proof.map((p) => (
                <li key={p} className="flex gap-3 text-lg"><Check /><span>{p}</span></li>
              ))}
            </ul>
          </div>

          <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] shadow-xl md:aspect-[4/5]">
            <Image
              src={landing.heroImage.src}
              alt={landing.heroImage.alt}
              fill
              priority
              sizes="(min-width: 768px) 480px, 100vw"
              className="object-cover"
              style={{ objectPosition: landing.heroImage.position }}
            />
            {!buyable && <span className="absolute left-4 top-4 rounded-full bg-ink px-4 py-2 font-medium text-white">Próximamente</span>}
          </div>
        </div>
        <span id="hero-fin" aria-hidden="true" />
      </section>

      {/* 2. Datos rápidos: cuatro tarjetas del mismo tamaño y con el mismo orden */}
      <section aria-label="Datos del programa" className="border-y border-clay-soft bg-white">
        <dl className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {landing.facts.map((f) => (
            <div key={f.label} className="flex items-start gap-4 rounded-2xl bg-sand p-5 lg:flex-col lg:gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-clay-dark shadow-sm">
                <FactGlyph name={f.icon} />
              </span>
              <div className="min-w-0">
                <dt className="text-sm font-medium uppercase tracking-wide text-muted">{f.label}</dt>
                <dd className="text-xl font-bold leading-snug text-clay-dark">{f.value}</dd>
                {f.detail && <dd className="mt-0.5 text-base leading-snug text-muted">{f.detail}</dd>}
              </div>
            </div>
          ))}
        </dl>
      </section>

      {/* 3. Para quién es */}
      <Section id="para-ti" label="para-ti">
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div>
            <H2 id="para-ti">Esta formación es para ti si…</H2>
            <ul className="space-y-4">
              {landing.audience.map((a) => <li key={a} className="flex gap-3 text-lg"><Check /><span>{a}</span></li>)}
            </ul>
          </div>
          <div className="rounded-3xl border border-clay-soft bg-white p-8">
            <p className="mb-2 text-2xl font-bold text-clay-dark">¿Y si no tengo experiencia?</p>
            <p className="text-lg">{landing.prerequisites}</p>
          </div>
        </div>
      </Section>

      {/* 4. Qué vas a lograr */}
      <Section id="lograras" tone="soft" label="lograras">
        <H2 id="lograras">Lo que vas a lograr</H2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {landing.outcomes.map((o) => (
            <div key={o.title} className="rounded-3xl bg-white p-6">
              <h3 className="mb-2 text-xl font-bold">{o.title}</h3>
              <p className="text-lg text-muted">{o.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5. Prueba social real */}
      {(googleReviews || (landing.testimonials && landing.testimonials.length > 0)) && (
        <Section id="opiniones" tone="white" label="opiniones">
          <H2 id="opiniones" center sub={googleReviews ? undefined : "Opiniones reales de nuestra comunidad en Google."}>
            Lo que dicen quienes ya estudiaron con nosotras
          </H2>

          {googleReviews ? (
            <>
              {googleReviews.rating && (
                <p className="mb-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-lg">
                  <Stars n={googleReviews.rating} />
                  <span className="text-2xl font-bold text-clay-dark">{googleReviews.rating.toLocaleString("es-CO", { minimumFractionDigits: 1 })}</span>
                  <span className="text-muted">· {googleReviews.total.toLocaleString("es-CO")} reseñas en Google Maps</span>
                </p>
              )}
              <div className="grid gap-6 md:grid-cols-2">
                {googleReviews.reviews.map((r) => (
                  <figure key={`${r.sede}-${r.author}`} className="flex flex-col rounded-3xl border border-clay-soft bg-sand p-7">
                    <Stars n={r.rating} />
                    <blockquote className="mt-3 flex-1 text-xl leading-relaxed">«{r.text}»</blockquote>
                    <figcaption className="mt-4 font-medium text-clay-dark">
                      {r.authorUrl ? <a href={r.authorUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">{r.author}</a> : r.author}
                      <span className="font-normal text-muted"> · Sede {r.sede} · Reseña en Google</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p className="mt-8 flex flex-wrap items-center justify-center gap-3 text-center">
                {googleReviews.places.filter((p) => p.mapsUrl).map((p) => (
                  <a key={p.sede} href={p.mapsUrl!} target="_blank" rel="noopener noreferrer" className="btn btn-secondary !min-h-12">Ver reseñas de la sede {p.sede}</a>
                ))}
              </p>
            </>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {landing.testimonials?.map((t) => (
                <figure key={t.author} className="rounded-3xl border border-clay-soft bg-sand p-7">
                  <blockquote className="text-xl leading-relaxed">«{t.quote}»</blockquote>
                  <figcaption className="mt-4 font-medium text-clay-dark">{t.author}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 6. Qué vas a aprender: preguntas que se abren */}
      <Section id="temario" label="temario">
        <H2 id="temario" center sub="Toca una pregunta para ver el detalle.">Qué vas a aprender</H2>
        <div className="mx-auto max-w-3xl space-y-3">
          {landing.curriculum.map((block, i) => (
            <details key={block.title} open={i === 0} className="group rounded-2xl border border-clay-soft bg-white p-5">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-clay-dark sm:text-xl [&::-webkit-details-marker]:hidden">
                {block.question ?? block.title}
                <span aria-hidden="true" className="text-2xl transition group-open:rotate-45">+</span>
              </summary>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-lg">
                {block.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </details>
          ))}
        </div>
      </Section>

      {/* 7. Revista */}
      {landing.magazine && magazine && (
        <Section id="revista" tone="soft" label="revista">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <H2 id="revista">Hojea la revista del programa</H2>
              <p className="mb-6 text-lg">Conoce el programa página por página, como una revista: objetivos, contenidos, docentes, instalaciones y más. Funciona en tu celular y en tu computador.</p>
            </div>
            <div className="flex justify-center md:justify-end">
              <MagazineViewer slug={program.slug} title={program.title} pages={magazine.paginas} width={magazine.ancho} height={magazine.alto} landscape={magazine.horizontal} />
            </div>
          </div>
        </Section>
      )}

      {/* 8. Docentes */}
      <Section id="docentes" tone="white" label="docentes">
        <H2 id="docentes">Quiénes te acompañan</H2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {landing.teachers.map((t) => (
            <article key={t.name} className="rounded-3xl border border-clay-soft bg-sand p-6">
              <div className="mb-4 flex items-center gap-4">
                {t.photo ? (
                  <Image src={t.photo} alt={`Foto de ${t.name}`} width={88} height={88} className="h-22 w-22 shrink-0 rounded-full object-cover object-top" />
                ) : (
                  <span className="grid h-22 w-22 shrink-0 place-items-center rounded-full bg-clay-soft text-2xl font-bold text-clay-dark" aria-hidden="true">{t.name.charAt(0)}</span>
                )}
                <div>
                  <h3 className="text-xl font-bold">{t.name}</h3>
                  <p className="text-muted">{t.role}</p>
                </div>
              </div>
              <p className="text-lg">{t.bio}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* 9. Horarios, qué incluye y requisitos */}
      <Section id="detalles" label="detalles">
        <H2 id="detalles">Todo lo que necesitas saber</H2>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-clay-soft bg-white p-7">
            <h3 className="mb-4 text-2xl font-bold">Horarios</h3>
            <div className="space-y-4">
              {landing.schedule.map((s) => (
                <div key={s.title}>
                  <p className="font-bold text-clay-dark">{s.title}</p>
                  <ul className="mt-1 space-y-1 text-lg">{s.lines.map((l) => <li key={l}>{l}</li>)}</ul>
                </div>
              ))}
              <p className="text-muted">Fechas de inicio: las confirma una asesora al inscribirte.</p>
            </div>
          </div>
          <div className="rounded-3xl border border-clay-soft bg-white p-7">
            <h3 className="mb-4 text-2xl font-bold">Qué incluye</h3>
            <ul className="space-y-3">{landing.includes.map((i) => <li key={i} className="flex gap-3 text-lg"><Check /><span>{i}</span></li>)}</ul>
          </div>
          {landing.requirements.length > 0 && (
            <div className="rounded-3xl border border-clay-soft bg-white p-7">
              <h3 className="mb-4 text-2xl font-bold">Para graduarte</h3>
              <ul className="list-disc space-y-3 pl-6 text-lg">{landing.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          )}
        </div>
      </Section>

      {/* 10. Inscripción (con precio) o lista de espera */}
      {buyable ? (
        <Section id="inscripcion" tone="soft" label="inscripcion">
          <div className="mx-auto max-w-3xl rounded-[2rem] bg-white p-8 text-center shadow-lg sm:p-12">
            <h2 id="inscripcion-t" className="mb-2 text-3xl font-bold sm:text-4xl">Inscríbete hoy</h2>
            <p className="mb-6 text-lg text-muted">{program.title}</p>
            {percent > 0 && <p className="text-xl text-muted line-through">{formatCOP(list)}</p>}
            <p className="text-5xl font-bold text-clay-dark sm:text-6xl">{formatCOP(final)}</p>
            <p className="mt-2 text-lg">
              {percent > 0 ? `Pagando el valor completo hoy ahorras ${formatCOP(saving)} (${percent}%).` : "Valor del programa."}
              {program.priceNote ? ` Valor ${program.priceNote}.` : ""}
            </p>
            <div className="mt-8">{buy("pricing", "btn btn-primary !min-h-16 w-full text-xl sm:w-auto sm:!px-16")}</div>
            <ul className="mx-auto mt-8 max-w-md space-y-3 text-left text-lg">
              <li className="flex gap-3"><Check /><span>Pago seguro con tarjeta en un solo pago.</span></li>
              <li className="flex gap-3"><Check /><span>¿Quieres cuotas? Las difieres con tu banco al pagar con tu tarjeta de crédito.</span></li>
              <li className="flex gap-3"><Check /><span>Al pagar recibes un correo con el paso a paso para entrar al campus virtual.</span></li>
            </ul>
            <p className="mt-6 text-lg">¿Dudas antes de pagar? <a href={advisor} target="_blank" rel="noopener noreferrer" className="font-medium text-clay-dark underline">Habla con una asesora por WhatsApp</a>.</p>
          </div>
        </Section>
      ) : (
        <Section id="avisame" tone="soft" label="avisame">
          <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-lg sm:p-10">
            <h2 id="avisame-t" className="mb-2 text-3xl font-bold">Sé la primera en enterarte</h2>
            <p className="mb-6 text-lg text-muted">Estamos confirmando fechas y horarios de este programa. Déjanos tus datos y te avisamos apenas abramos inscripciones.</p>
            <LeadForm slug={program.slug} interest="waitlist" submitLabel="Avísame cuando abra" id="aviso" />
          </div>
        </Section>
      )}

      {/* 11. Preguntas frecuentes (solo dudas de la compra; el contenido está en «Qué vas a aprender») */}
      <Section id="preguntas" tone="soft" label="preguntas">
        <H2 id="preguntas" center sub="Lo que más nos preguntan antes de inscribirse.">Preguntas frecuentes</H2>
        <div className="mx-auto max-w-3xl space-y-3">
          {landing.faq.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-clay-soft bg-white p-5">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-clay-dark [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden="true" className="text-2xl transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-lg">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* 12. Cierre: otra vía para quien aún duda */}
      <section aria-labelledby="cierre-t" className="bg-clay-dark py-14 text-white sm:py-20">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 md:grid-cols-2">
          <div>
            <h2 id="cierre-t" className="mb-4 !text-white text-3xl font-bold sm:text-4xl">¿Aún tienes preguntas?</h2>
            <p className="mb-6 text-xl">Una asesora te orienta según tu nivel actual, tus objetivos y tu disponibilidad de tiempo.</p>
            <a href={advisor} target="_blank" rel="noopener noreferrer" className="btn bg-white text-clay-dark hover:bg-clay-soft">Escribir por WhatsApp</a>
            {buyable && <div className="mt-4">{buy("final", "btn btn-secondary !border-white !text-white hover:!bg-white/10")}</div>}
          </div>
          <div className="rounded-3xl bg-white p-6 text-ink sm:p-8">
            <p className="mb-4 text-2xl font-bold text-clay-dark">Recibe el temario y más información</p>
            <LeadForm slug={program.slug} interest="info" submitLabel="Quiero recibir información" id="info" />
          </div>
        </div>
      </section>

      {/* Barra fija en celular */}
      <StickyCta>
        {buyable ? (
          <div className="flex items-center gap-3">
            <p className="leading-tight"><span className="block text-sm text-muted">Pagando completo</span><span className="text-xl font-bold text-clay-dark">{formatCOP(final)}</span></p>
            {buy("sticky", "btn btn-primary flex-1 !min-h-14", "Inscribirme")}
          </div>
        ) : (
          <a href="#avisame" className="btn btn-primary w-full !min-h-14">Avísame cuando abra</a>
        )}
      </StickyCta>
    </>
  );
}
