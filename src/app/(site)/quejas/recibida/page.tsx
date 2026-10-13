import type { Metadata } from "next";
import Link from "next/link";
import { ScrollTop } from "@/components/ScrollTop";
import { REVIEW_BUSINESS_DAYS } from "@/lib/complaint-kinds";

export const metadata: Metadata = {
  title: "Recibimos tu solicitud",
  robots: { index: false, follow: false },
};

export default async function Recibida(props: PageProps<"/quejas/recibida">) {
  const q = await props.searchParams;
  const raw = Array.isArray(q.radicado) ? q.radicado[0] : q.radicado;
  const code = /^Q-\d{8}-[A-Z0-9]{5}$/.test(raw ?? "") ? raw : null;

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-center">
      <ScrollTop />
      <h1 className="mb-4 text-4xl font-bold">Recibimos tu solicitud</h1>
      <p className="mb-6 text-xl">Gracias por confiar en nosotras. Tu información será tratada de forma confidencial.</p>
      {code && (
        <p className="mb-6 rounded-3xl bg-clay-soft p-6">
          <span className="block text-lg">Tu número de radicado</span>
          <span className="text-3xl font-bold text-clay-dark">{code}</span>
        </p>
      )}
      <p className="mb-8 text-lg text-muted">
        Te enviamos el radicado a tu correo. En un plazo de {REVIEW_BUSINESS_DAYS} días hábiles te informaremos si tu solicitud fue aceptada para evaluación o desestimada.
      </p>
      <Link href="/" className="btn btn-primary">Volver al inicio</Link>
    </main>
  );
}
