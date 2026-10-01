import Image from "next/image";
import Link from "next/link";
import { ProgramCard } from "@/components/ProgramCard";
import { isPurchasable, programs } from "@/data/programs";
import { WHATSAPP_GENERAL } from "@/lib/whatsapp";

const pillars = [
  { title: "Yoga para todas las personas", text: "Programas multinivel: quien empieza desde cero y quien ya tiene camino practican a su propio ritmo y de forma segura." },
  { title: "Respaldo médico y fisioterapéutico", text: "Una médica cirujana y una fisioterapeuta especialista supervisan las metodologías para una práctica segura." },
  { title: "Sabiduría ancestral", text: "Ayurveda, Astrología Védica y meditación, junto con la anatomía científica." },
  { title: "Aval internacional", text: "Escuela registrada RYS 200 en Yoga Alliance, con una titulación reconocida en cualquier lugar del mundo." },
];

const sedes = [
  { name: "Bogotá", text: "Conecta con tu bienestar en el corazón de la capital: certificaciones y clases regulares en una ubicación central." },
  { name: "Cajicá", text: "Clases y talleres en un espacio acogedor y accesible, para tu práctica diaria sin alejarte de la ciudad." },
  { name: "Tabío", text: "Un refugio rodeado de montañas, sede de nuestros retiros espirituales y formaciones intensivas." },
];

export default function Home() {
  const featured = programs.filter(isPurchasable).slice(0, 3);

  return (
    <>
      {/* Portada */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2 md:py-20">
        <div className="space-y-6">
          <p className="font-medium tracking-wide text-muted">Escuela de formación de yoga y ayurveda</p>
          <h1 className="text-4xl font-bold sm:text-5xl">Fórmate como instructora de yoga con respaldo internacional</h1>
          <p className="text-xl text-muted">
            Más que una escuela: un espacio de transformación para tu salud física, mental y espiritual.
            Sedes en Bogotá, Cajicá y Tabío, y formación online.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/programas" className="btn btn-primary">Ver programas</Link>
            <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Hablar con una asesora</a>
          </div>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-xl">
          <Image src="/images/2026_04_IMG_9106-scaled.jpg" alt="Estudiantes practicando respiración en el salón de yoga" fill priority sizes="(min-width: 768px) 560px, 100vw" className="object-cover object-[35%_60%]" />
        </div>
      </section>

      {/* Por qué elegirnos */}
      <section className="bg-clay-soft py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="mb-10 text-3xl font-bold">¿Por qué elegir Fullness Camp?</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {pillars.map((p) => (
              <div key={p.title} className="rounded-3xl bg-white p-6">
                <h3 className="mb-2 text-xl font-bold">{p.title}</h3>
                <p className="text-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programas */}
      <section className="mx-auto max-w-6xl px-5 pt-16">
        <h2 className="mb-3 text-3xl font-bold">Programas disponibles</h2>
        <p className="mb-8 max-w-2xl text-lg text-muted">Paga el valor completo en línea y recibe el descuento. Si prefieres cuotas, puedes pagar con tu tarjeta de crédito y diferir con tu banco.</p>
        <div className="grid gap-6 md:grid-cols-3">
          {featured.map((p) => <ProgramCard key={p.slug} program={p} />)}
        </div>
        <p className="mt-8"><Link href="/programas" className="btn btn-secondary">Ver todos los programas</Link></p>
      </section>

      {/* Sedes */}
      <section className="mx-auto max-w-6xl px-5 pt-16">
        <h2 className="mb-8 text-3xl font-bold">Nuestras sedes</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {sedes.map((s) => (
            <div key={s.name} className="rounded-3xl border border-clay-soft bg-white p-6">
              <h3 className="mb-2 text-xl font-bold">Sede {s.name}</h3>
              <p className="text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Asesoría */}
      <section className="mx-auto mt-16 max-w-4xl rounded-[2rem] bg-clay-dark px-6 py-12 text-center text-white">
        <h2 className="!text-white text-3xl font-bold">¿No sabes cuál certificación es para ti?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg">Nuestro equipo de asesoras te guía según tu nivel actual, tus objetivos y tu disponibilidad de tiempo.</p>
        <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="btn mt-6 bg-white text-clay-dark hover:bg-clay-soft">Quiero asesoría por WhatsApp</a>
      </section>
    </>
  );
}
