import type { Metadata } from "next";
import { ComplaintForm } from "@/components/ComplaintForm";
import { politica } from "@/data/politicas";
import { REVIEW_BUSINESS_DAYS } from "@/lib/complaint-kinds";
import { WHATSAPP_GENERAL } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Quejas y denuncias: un espacio seguro",
  description: "Presenta de forma confidencial una queja, una denuncia de acoso o de represalias. Te respondemos con un número de radicado.",
  alternates: { canonical: "/quejas" },
  robots: { index: false, follow: true },
};

const link = "font-medium text-clay-dark underline";

export default function Quejas() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <h1 className="mb-4 text-4xl font-bold">Quejas y denuncias</h1>
      <p className="mb-8 text-xl text-muted">
        Un espacio seguro para contarnos si algo no estuvo bien. Aquí te escuchamos, sin juicios.
      </p>

      <section aria-labelledby="como" className="mb-10 rounded-3xl bg-clay-soft p-6 sm:p-8">
        <h2 id="como" className="mb-4 text-2xl font-bold">Qué pasa cuando envías tu solicitud</h2>
        <ul className="list-disc space-y-2 pl-6 text-lg">
          <li>Recibes de inmediato un <strong>número de radicado</strong> en tu correo para darle seguimiento.</li>
          <li>Tu información es <strong>confidencial</strong>: solo la ve el órgano de revisión de la escuela.</li>
          <li>En un plazo de {REVIEW_BUSINESS_DAYS} días hábiles te informamos si la queja fue aceptada para evaluación o desestimada, y por qué.</li>
          <li><strong>Nadie puede tomar represalias</strong> contra ti por presentarla de buena fe.</li>
          <li>Pedimos tu nombre y correo porque la política exige identificar a quien presenta la queja y necesitamos poder responderte.</li>
        </ul>
        <p className="mt-5 text-lg">
          Lee las políticas completas:{" "}
          <a href={politica("quejas").href} target="_blank" rel="noopener noreferrer" className={link}>quejas</a>,{" "}
          <a href={politica("antiacoso").href} target="_blank" rel="noopener noreferrer" className={link}>anti-acoso</a> y{" "}
          <a href={politica("antirepresalias").href} target="_blank" rel="noopener noreferrer" className={link}>anti-represalias</a>.
        </p>
      </section>

      <p className="mb-8 rounded-2xl border-2 border-clay-soft p-5 text-lg">
        <strong>Si estás en peligro o necesitas atención urgente</strong>, comunícate primero con la Línea 123. Esta página no es un servicio de emergencias.
        Si prefieres hablar con una persona, escríbenos por{" "}
        <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className={link}>WhatsApp</a>.
      </p>

      <ComplaintForm />
    </main>
  );
}
