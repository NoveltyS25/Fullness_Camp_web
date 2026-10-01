import type { Metadata } from "next";
import { WHATSAPP_GENERAL } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contacto y preguntas frecuentes",
  description: "Escríbenos por WhatsApp. Horarios de atención y respuestas a las preguntas más frecuentes sobre las certificaciones de yoga.",
  alternates: { canonical: "/contacto" },
};

const faqs = [
  {
    q: "¿Necesito experiencia previa para tomar las clases o certificaciones?",
    a: "No. Creemos que el yoga es para todas las personas. Nuestros programas son multinivel: nuestras docentes (médicas y fisioterapeutas) adaptan la práctica tanto para quienes inician desde cero como para estudiantes avanzadas.",
  },
  {
    q: "¿En qué sedes ofrecen las formaciones y retiros?",
    a: "Ofrecemos clases regulares y certificaciones en las sedes de Cajicá y Bogotá. Los retiros espirituales y las formaciones intensivas suelen realizarse en Tabío, rodeados de naturaleza.",
  },
  {
    q: "¿Qué incluye una certificación en Fullness Camp?",
    a: "Somos una escuela registrada RYS 200. Incluye material teórico-práctico completo, mentoría con docentes de más de 7.000 horas de experiencia y un enfoque integral que va desde la anatomía científica hasta el Ayurveda y la Astrología Védica.",
  },
  {
    q: "Tengo una lesión o condición física, ¿puedo practicar con ustedes?",
    a: "Sí. Contamos con una médica cirujana y una fisioterapeuta especialista que supervisan nuestras metodologías para que personas con patologías o discapacidades vivan el yoga de forma segura y a su propio ritmo.",
  },
  {
    q: "¿Cómo puedo inscribirme o conocer los precios?",
    a: "Puedes ver los valores en la página de programas y pagar en línea, o escribirnos por WhatsApp para que una asesora te guíe en la elección del programa.",
  },
];

export default function Contacto() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="mb-4 text-4xl font-bold">Contacto</h1>
      <p className="mb-8 text-lg text-muted">La forma más rápida de hablar con nosotras es por WhatsApp.</p>

      <div className="mb-12 rounded-3xl border border-clay-soft bg-white p-6">
        <h2 className="mb-2 text-2xl font-bold">Horarios de atención</h2>
        <p className="mb-6">Lunes a viernes: 8 a. m. – 8 p. m.<br />Sábado: 8 a. m. – 3 p. m.</p>
        <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Hablar con una asesora</a>
      </div>

      <h2 className="mb-6 text-2xl font-bold">Preguntas frecuentes</h2>
      <div className="space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-clay-soft bg-white p-5">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-clay-dark [&::-webkit-details-marker]:hidden">
              {f.q}
              <span aria-hidden="true" className="text-2xl transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3">{f.a}</p>
          </details>
        ))}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </main>
  );
}
