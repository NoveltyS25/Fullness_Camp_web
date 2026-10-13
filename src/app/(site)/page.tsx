import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Photo } from "@/components/home/Photo";
import { FactGlyph } from "@/components/landing/FactGlyph";
import { Reviews } from "@/components/Reviews";
import { SITE_TESTIMONIALS, TEAM, getLanding, type FactIcon } from "@/data/landing";
import { getProgram, isPurchasable } from "@/data/programs";
import { SEDES } from "@/data/sedes";
import { PAY_IN_FULL_PERCENT, formatCOP } from "@/lib/pricing";
import { WHATSAPP_GENERAL } from "@/lib/whatsapp";
import { fetchGoogleReviews } from "@/server/google-reviews";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fullnesscampinternacional.com";

export const metadata: Metadata = {
  title: { absolute: "Fullness Camp | Escuela de formación de instructores de yoga en Bogotá, Cajicá y Tabío" },
  description:
    "Formación de instructores de yoga con aval internacional (RYS 200, Yoga Alliance). Hatha Vinyasa, Yoga y Pilates, Yoga Kids y más, en Bogotá, Cajicá, Tabío y online.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CO",
    title: "Fullness Camp | Escuela de formación de instructores de yoga",
    description: "Certificaciones de yoga con aval internacional en Bogotá, Cajicá, Tabío y online.",
    url: "/",
    images: [{ url: "/images/2026_03_IMG_7580.jpg", alt: "Grupo practicando yoga en el domo geodésico de Tabío" }],
  },
};

const STATS = [
  { value: "RYS 200", label: "Escuela registrada en Yoga Alliance" },
  { value: "+7.000", label: "horas de experiencia docente" },
  { value: "15 años", label: "transformando vidas" },
  { value: "3 sedes", label: "y clases online" },
];

const ABOUT: { icon: FactIcon; title: string; text: string }[] = [
  { icon: "leaf", title: "Yoga y meditación", text: "Formaciones profesionales y prácticas para todos los niveles." },
  { icon: "heart", title: "Ayurveda y alimentación saludable", text: "Nutrición consciente para tu biotipo." },
  { icon: "sparkles", title: "Sanación energética", text: "Armonización de chakras y técnicas de bienestar." },
  { icon: "mountain", title: "Experiencias de inmersión", text: "Danza, retiros espirituales y mucho más." },
];

const WHY: { icon: FactIcon; title: string; text: string }[] = [
  { icon: "users", title: "Yoga para todas las personas", text: "Programas multinivel: quien empieza desde cero y quien ya tiene camino practican a su propio ritmo y de forma segura." },
  { icon: "cross", title: "Respaldo médico y fisioterapéutico", text: "Una médica cirujana y fisioterapeutas especialistas supervisan las metodologías para una práctica segura." },
  { icon: "book", title: "Sabiduría ancestral", text: "Ayurveda, Astrología Védica y meditación, junto con la anatomía científica." },
  { icon: "award", title: "Aval internacional", text: "Escuela registrada RYS 200 en Yoga Alliance, con una titulación reconocida en cualquier lugar del mundo." },
];

const STEPS = [
  { n: 1, title: "Elige tu programa", text: "Conoce el temario, hojea la revista de cada certificación o habla con una asesora por WhatsApp." },
  { n: 2, title: "Inscríbete en línea", text: "Pagas en un solo pago con tarjeta y recibes un descuento. Si prefieres cuotas, las difieres con tu banco." },
  { n: 3, title: "Estudia con tu campus virtual", text: "Te llega un correo para crear tu contraseña y entrar con tu cédula a ver tus clases y horarios." },
];

const CARD_PHOTO_POSITION: Record<string, string> = { "certificacion-de-yoga-kids": "50% 100%" };

const GALLERY: { src: string; alt: string; w: number; h: number }[] = [
  { src: "/images/2026_03_IMG_7965.jpg", alt: "Grupo practicando yoga en el domo geodésico de Tabío, con la imagen de Buda al fondo", w: 800, h: 1422 },
  { src: "/images/2026_04_IMG_9119.jpg", alt: "Grupo en posturas de pie sobre el piso de madera de la sede de Bogotá", w: 1000, h: 563 },
  { src: "/images/2026_04_IMG_2847-scaled.jpg", alt: "Estudiante en postura de descanso frente a una ventana amplia en Cajicá", w: 800, h: 1422 },
  { src: "/images/2026_03_IMG_7639.jpg", alt: "Estudiante en una postura invertida dentro del domo de Tabío", w: 800, h: 1422 },
  { src: "/images/2026_04_IMG_4755-scaled.jpg", alt: "Dos personas estirando juntas en el salón de Cajicá", w: 800, h: 1422 },
  { src: "/images/2026_04_IMG_9104.jpg", alt: "Mujer meditando con un bloque de yoga en la sede de Bogotá", w: 800, h: 1422 },
];

const FEATURED = ["hatha-vinyasa-yoga-y-meditacion", "certificacion-de-yoga-y-pilates", "certificacion-de-yoga-kids"];

function SectionTitle({ id, kicker, children, sub, light = false }: { id: string; kicker?: string; children: React.ReactNode; sub?: string; light?: boolean }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      {kicker && <p className={`mb-3 font-medium uppercase tracking-widest ${light ? "text-clay-soft" : "text-clay-dark"}`}>{kicker}</p>}
      <h2 id={id} className={`text-3xl font-bold sm:text-4xl ${light ? "!text-white" : ""}`}>{children}</h2>
      {sub && <p className={`mt-4 text-lg ${light ? "text-white/90" : "text-muted"}`}>{sub}</p>}
    </div>
  );
}

export default async function Home() {
  const googleReviews = await fetchGoogleReviews();

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Fullness Camp Internacional",
    url: SITE,
    logo: `${SITE}/brand/logo.png`,
    description: "Escuela de formación de instructores de yoga y ayurveda con aval internacional.",
    areaServed: ["Bogotá", "Cajicá", "Tabío", "Colombia"],
    department: SEDES.map((s) => ({ "@type": "EducationalOrganization", name: `Fullness Camp sede ${s.name}`, hasMap: s.mapUrl })),
    contactPoint: { "@type": "ContactPoint", contactType: "customer service", telephone: "+57 311 674 1900", availableLanguage: "es" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c") }} />

      {/* 1. Portada */}
      <section aria-labelledby="hero-t" className="relative overflow-hidden bg-sand">
        <div aria-hidden="true" className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-clay-soft/70 blur-2xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-10 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-base font-medium text-clay-dark shadow-sm ring-1 ring-clay-soft">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-clay" />
              Escuela de yoga y ayurveda · Registrada RYS 200
            </p>
            <h1 id="hero-t" className="text-4xl font-bold sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Formación de instructores de yoga con respaldo internacional
            </h1>
            <p className="text-lg text-muted sm:text-xl">
              Más que una escuela: un espacio de transformación para tu salud física, mental y espiritual. Aprende con docentes de más de
              7.000 horas de experiencia, en Bogotá, Cajicá, Tabío o en línea.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/programas" className="btn btn-primary !min-h-16 !px-10 text-xl">Ver certificaciones</Link>
              <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Hablar con una asesora</a>
            </div>
            <ul className="grid gap-2 pt-1 text-lg sm:grid-cols-2">
              {["Multinivel: no se requiere experiencia", "Diploma internacional", "Clases online y presenciales", "Respaldo médico y fisioterapéutico"].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-clay-soft text-clay-dark">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Mosaico de fotos con formas de arco */}
          <div className="relative">
            <div aria-hidden="true" className="absolute -right-5 -top-5 -z-10 h-44 w-44 rounded-full bg-clay-soft" />
            <div aria-hidden="true" className="absolute -bottom-6 -left-6 -z-10 h-36 w-36 rounded-full bg-clay/30" />
            <div className="grid h-[25rem] grid-cols-5 grid-rows-2 gap-3 sm:h-[34rem] sm:gap-4">
              <Photo src="/images/2026_03_IMG_7580.jpg" alt="Grupo practicando yoga dentro del domo geodésico de Tabío" position="50% 60%" sizes="(min-width: 1024px) 300px, 60vw" priority className="col-span-3 row-span-2 rounded-b-3xl rounded-t-[999px]" />
              <Photo src="/images/2026_04_IMG_9106-scaled.jpg" alt="Estudiantes practicando respiración consciente en la sede de Bogotá" position="35% 60%" sizes="(min-width: 1024px) 200px, 40vw" className="col-span-2 rounded-b-3xl rounded-t-[999px]" />
              <Photo src="/images/2026_04_IMG_2898-scaled.jpg" alt="Mujer en postura de meditación en el salón de la sede de Cajicá" position="50% 40%" sizes="(min-width: 1024px) 200px, 40vw" className="col-span-2 rounded-t-3xl rounded-b-[999px]" />
            </div>
            <p className="absolute -bottom-4 left-3 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-medium text-clay-dark shadow-xl ring-1 ring-clay-soft sm:left-6">
              <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-clay-soft"><FactGlyph name="award" /></span>
              Escuela registrada · Yoga Alliance
            </p>
          </div>
        </div>
      </section>

      {/* 2. Cifras de confianza */}
      <section aria-label="Quiénes somos en cifras" className="border-y border-clay-soft bg-white">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-5 py-10 text-center lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <dt className="text-3xl font-bold text-clay-dark sm:text-4xl">{s.value}</dt>
              <dd className="mt-1 text-base text-muted sm:text-lg">{s.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 3. Más que una escuela */}
      <section aria-labelledby="escuela-t" className="bg-sand py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-md">
            <Photo src="/images/2026_03_IMG_7688-scaled.jpg" alt="Estudiante en una postura de yoga dentro del domo geodésico" position="50% 55%" sizes="(min-width: 1024px) 448px, 90vw" className="aspect-[4/5] rounded-b-[2rem] rounded-t-[999px] shadow-xl" />
          </div>
          <div>
            <p className="mb-3 font-medium uppercase tracking-widest text-clay-dark">Fullness Camp Internacional</p>
            <h2 id="escuela-t" className="mb-5 text-3xl font-bold sm:text-4xl">Más que una escuela: un espacio de transformación integral</h2>
            <p className="mb-8 text-lg text-muted">
              Nos especializamos en la formación de yoga y el despertar de la consciencia, con un viaje profundo hacia tu interior a través de la
              sabiduría ancestral y las técnicas modernas. Aquí el yoga se adapta a ti, y no al revés.
            </p>
            <ul className="grid gap-5 sm:grid-cols-2">
              {ABOUT.map((a) => (
                <li key={a.title} className="flex gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-clay-dark shadow-sm"><FactGlyph name={a.icon} /></span>
                  <span>
                    <strong className="block text-lg text-clay-dark">{a.title}</strong>
                    <span className="text-muted">{a.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Programas */}
      <section aria-labelledby="programas-t" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle id="programas-t" kicker="Certificaciones" sub="Programas con diploma internacional. Paga el valor completo en línea y recibe tu descuento.">Elige tu camino como instructor</SectionTitle>
          <div className="grid gap-8 md:grid-cols-3">
            {FEATURED.map((slug) => {
              const p = getProgram(slug);
              const l = getLanding(slug);
              if (!p || !l) return null;
              const pct = PAY_IN_FULL_PERCENT[p.category];
              return (
                <article key={slug} className="group flex flex-col overflow-hidden rounded-[2rem] border border-clay-soft bg-sand transition hover:shadow-xl">
                  <Link href={`/programas/${slug}`} className="relative block aspect-[4/3] overflow-hidden" aria-hidden="true" tabIndex={-1}>
                    <Photo src={l.heroImage.src} alt="" position={CARD_PHOTO_POSITION[slug] ?? l.heroImage.position} sizes="(min-width: 768px) 360px, 90vw" className="h-full w-full transition duration-500 group-hover:scale-105" />
                    {p.hours && <span className="absolute left-4 top-4 rounded-full bg-white px-4 py-1.5 text-base font-bold text-clay-dark shadow">{p.hours} horas</span>}
                  </Link>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-xl font-bold">
                      <Link href={`/programas/${slug}`} className="no-underline hover:underline">{p.title.replace(/\s*\(\d+\s*hrs?\)/i, "")}</Link>
                    </h3>
                    <p className="mt-2 flex-1 text-muted">{l.subheadline}</p>
                    {isPurchasable(p) && (
                      <p className="mt-5">
                        <span className="text-sm text-muted">Pagando completo</span>
                        <span className="block text-2xl font-bold text-clay-dark">{formatCOP(Math.round(p.priceCOP * (1 - pct / 100)))}</span>
                      </p>
                    )}
                    <Link href={`/programas/${slug}`} className="btn btn-primary mt-5">Ver el programa</Link>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-10 text-center">
            <Link href="/programas" className="btn btn-secondary">Ver todos los programas, talleres y retiros</Link>
          </p>
        </div>
      </section>

      {/* 5. Por qué elegirnos */}
      <section aria-labelledby="por-que-t" className="bg-clay-soft py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle id="por-que-t" kicker="Por qué Fullness Camp" sub="No solo enseñamos posturas: facilitamos un viaje profundo hacia tu bienestar físico, energético y mental.">Un ecosistema de aprendizaje inclusivo</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <div key={w.title} className="rounded-3xl bg-white p-7">
                <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-clay-soft text-clay-dark"><FactGlyph name={w.icon} /></span>
                <h3 className="mb-2 text-xl font-bold">{w.title}</h3>
                <p className="text-muted">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Sedes */}
      <section aria-labelledby="sedes-t" className="bg-sand py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle id="sedes-t" kicker="Nuestras sedes" sub="Elige el lugar donde quieres practicar. También puedes tomar la teoría en línea.">Encuentra tu lugar de práctica</SectionTitle>
          <div className="grid gap-8 md:grid-cols-3">
            {SEDES.map((s) => (
              <article key={s.slug} className="flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-clay-soft">
                <Photo src={s.photo.src} alt={s.photo.alt} position={s.photo.position} sizes="(min-width: 768px) 360px, 90vw" className="aspect-[4/3]" />
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-2xl font-bold">Sede {s.name}</h3>
                  <p className="mt-1 font-medium text-clay-dark">{s.tagline}</p>
                  <p className="mt-3 flex-1 text-muted">{s.text}</p>
                  <p className="mt-4 text-base"><strong className="text-clay-dark">Ideal para:</strong> {s.ideal}</p>
                  <a href={s.mapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-5">Cómo llegar a {s.name}</a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6b. Galería: fotos reales de la escuela */}
      <section aria-labelledby="galeria-t" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle id="galeria-t" kicker="Vive la experiencia" sub="Momentos reales de nuestras clases en las tres sedes.">Así se practica en Fullness Camp</SectionTitle>
          <ul className="columns-2 gap-4 md:columns-3 md:gap-5">
            {GALLERY.map((g, i) => (
              <li key={g.src} className="mb-4 break-inside-avoid md:mb-5">
                <Image
                  src={g.src}
                  alt={g.alt}
                  width={g.w}
                  height={g.h}
                  sizes="(min-width: 768px) 360px, 45vw"
                  className={`h-auto w-full object-cover shadow-md ${i % 3 === 0 ? "rounded-t-[999px] rounded-b-3xl" : "rounded-3xl"}`}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 7. Cómo funciona */}
      <section aria-labelledby="como-t" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle id="como-t" kicker="Así de simple" sub="De la decisión a tu primera clase, sin trámites complicados.">Cómo empezar tu formación</SectionTitle>
          <ol className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="relative rounded-3xl border border-clay-soft bg-sand p-8 pt-12">
                <span className="absolute -top-6 left-8 grid h-14 w-14 place-items-center rounded-full bg-clay-dark font-serif text-2xl font-bold text-white shadow-lg">{s.n}</span>
                <h3 className="mb-2 text-xl font-bold">{s.title}</h3>
                <p className="text-lg text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 text-center"><Link href="/programas" className="btn btn-primary">Elegir mi programa</Link></p>
        </div>
      </section>

      {/* 8. Opiniones reales */}
      <Reviews id="opiniones" tone="soft" googleReviews={googleReviews} fallback={SITE_TESTIMONIALS} />

      {/* 9. Directora y equipo */}
      <section aria-labelledby="equipo-t" className="bg-sand py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="mx-auto w-full max-w-sm">
              <Photo src={TEAM.lila.photo} alt="Lila Govardhan, directora de Fullness Camp, en postura de meditación" position="50% 30%" sizes="(min-width: 1024px) 384px, 80vw" className="aspect-[4/5] rounded-b-[2rem] rounded-t-[999px] shadow-xl" />
            </div>
            <div>
              <p className="mb-3 font-medium uppercase tracking-widest text-clay-dark">Nuestra directora</p>
              <h2 id="equipo-t" className="mb-5 text-3xl font-bold sm:text-4xl">{TEAM.lila.name}</h2>
              <blockquote className="mb-6 border-l-4 border-clay pl-5 font-serif text-xl leading-relaxed text-ink sm:text-2xl">
                «La espiritualidad se aplica en la cotidianidad… todo lo que te sucede son experiencias para evolucionar como ser humano y como alma».
              </blockquote>
              <p className="text-lg text-muted">{TEAM.lila.bio}</p>
            </div>
          </div>

          <div className="mt-16">
            <h3 className="mb-6 text-center text-2xl font-bold">Un equipo que cuida tu práctica</h3>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[TEAM.cely, TEAM.maria, TEAM.daniel, TEAM.william].map((t) => (
                <li key={t.name} className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-clay-soft">
                  {t.photo && <Image src={t.photo} alt={`Foto de ${t.name}`} width={72} height={72} className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-full object-cover object-top" />}
                  <span>
                    <strong className="block leading-snug text-clay-dark">{t.name}</strong>
                    <span className="text-sm text-muted">{t.role}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 10. Campus virtual */}
      <section aria-labelledby="campus-t" className="bg-clay-dark py-16 text-white sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 font-medium uppercase tracking-widest text-clay-soft">Campus virtual</p>
            <h2 id="campus-t" className="mb-5 text-3xl font-bold !text-white sm:text-4xl">Tus clases, tu horario y tus avisos en un solo lugar</h2>
            <p className="mb-6 text-lg text-white/90">
              Entra con tu cédula, revisa tus programas y tu horario, y recibe un aviso por correo y por WhatsApp si tu profesora cambia una clase.
            </p>
            <ul className="mb-8 space-y-3 text-lg">
              {["Ves tus próximas clases por día", "Avisos de cambios de horario en la plataforma, el correo y WhatsApp", "Tu cuenta se crea al inscribirte: sin trámites aparte"].map((t) => (
                <li key={t} className="flex items-start gap-3"><span aria-hidden="true" className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15">✓</span>{t}</li>
              ))}
            </ul>
            <Link href="/campus/ingresar" className="btn bg-white text-clay-dark hover:bg-clay-soft">Entrar al campus virtual</Link>
          </div>

          {/* Vista de ejemplo del campus */}
          <div aria-hidden="true" className="mx-auto w-full max-w-md rotate-1 rounded-[2rem] bg-sand p-5 text-ink shadow-2xl">
            <p className="mb-1 text-sm font-medium uppercase tracking-wider text-muted">Vista de ejemplo</p>
            <p className="mb-4 font-serif text-2xl font-bold text-clay-dark">Mi horario</p>
            {[
              { day: "Martes", time: "6:00 – 8:00 p. m.", name: "Módulo 1 · Fundamentos", where: "Sede Bogotá" },
              { day: "Sábado", time: "8:00 – 10:00 a. m.", name: "Práctica en el domo", where: "Sede Tabío" },
            ].map((c) => (
              <div key={c.name} className="mb-3 rounded-2xl bg-white p-4 ring-1 ring-clay-soft">
                <p className="text-sm text-muted">{c.day}</p>
                <p className="font-bold text-clay-dark">{c.name}</p>
                <p className="text-sm">{c.time} · {c.where}</p>
              </div>
            ))}
            <div className="rounded-2xl bg-clay-soft p-4">
              <p className="text-sm font-medium text-clay-dark">Aviso nuevo</p>
              <p className="text-sm">Cambio de horario: tu clase del martes pasó a las 7:00 p. m.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Cierre */}
      <section aria-labelledby="cierre-t" className="bg-sand py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 id="cierre-t" className="mb-4 text-3xl font-bold sm:text-4xl">¿Lista para empezar tu camino?</h2>
          <p className="mb-8 text-lg text-muted">Una asesora te orienta según tu nivel, tus objetivos y tu disponibilidad. Atención de lunes a viernes de 8 a. m. a 8 p. m. y sábados de 8 a. m. a 3 p. m.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/programas" className="btn btn-primary !min-h-16 !px-10 text-xl">Ver certificaciones</Link>
            <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Escribir por WhatsApp</a>
          </div>
        </div>
      </section>
    </>
  );
}
