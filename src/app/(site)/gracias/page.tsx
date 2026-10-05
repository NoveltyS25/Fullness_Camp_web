import type { Metadata } from "next";
import Link from "next/link";
import { ScrollTop } from "@/components/ScrollTop";
import { TrackEvent } from "@/components/landing/TrackEvent";
import { getProgram } from "@/data/programs";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "¡Gracias! Recibimos tus datos",
  robots: { index: false, follow: false },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function Gracias(props: PageProps<"/gracias">) {
  const q = await props.searchParams;
  const program = getProgram(one(q.programa));
  const waitlist = one(q.tipo) === "waitlist";
  const name = one(q.nombre).slice(0, 40);
  const title = program?.title ?? "nuestros programas";

  const wa = whatsappLink(
    waitlist
      ? `Hola, soy ${name || "una persona interesada"}. Dejé mis datos para que me avisen cuando abra: ${title}.`
      : `Hola, soy ${name || "una persona interesada"}. Dejé mis datos y quisiera información sobre: ${title}.`,
  );

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-center">
      <ScrollTop />
      <TrackEvent event="lead_confirmed" params={{ item_id: program?.slug ?? "", lead_type: waitlist ? "waitlist" : "info" }} />
      <p className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-clay-dark text-3xl text-white" aria-hidden="true">✓</p>
      <h1 className="mb-3 text-4xl font-bold">¡Gracias{name ? `, ${name}` : ""}!</h1>
      <p className="mb-8 text-xl">
        {waitlist
          ? `Anotamos tus datos. Te avisaremos apenas abramos inscripciones de «${title}».`
          : `Recibimos tus datos. Una asesora te escribirá pronto sobre «${title}». También te enviamos un correo de confirmación.`}
      </p>

      <div className="rounded-3xl bg-clay-soft p-6">
        <p className="mb-4 text-lg font-medium">¿Prefieres hablar ahora mismo?</p>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full sm:w-auto">Escribir a una asesora por WhatsApp</a>
      </div>

      <p className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {program && <Link href={`/programas/${program.slug}`} className="btn btn-secondary">Volver al programa</Link>}
        <Link href="/programas" className="btn btn-secondary">Ver otros programas</Link>
      </p>
    </main>
  );
}
