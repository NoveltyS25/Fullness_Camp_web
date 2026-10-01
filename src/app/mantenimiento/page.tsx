import Image from "next/image";

const advisor = process.env.NEXT_PUBLIC_WHATSAPP_ADVISOR ?? "573116741900";
const whatsappHref = `https://wa.me/${advisor}?text=${encodeURIComponent(
  "Hola, quisiera información sobre las certificaciones de yoga de Fullness Camp.",
)}`;

export const metadata = {
  title: "Estamos renovando nuestra casa",
  robots: { index: false, follow: false },
};

export default function Mantenimiento() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <Image src="/brand/logo.png" alt="Fullness Camp" width={160} height={150} priority />

      <div className="max-w-xl space-y-4">
        <h1 className="font-serif text-3xl font-bold text-clay-dark sm:text-4xl">
          Estamos renovando nuestra casa
        </h1>
        <p className="text-lg leading-relaxed">
          Muy pronto tendrás un nuevo Fullness Camp: inscripciones y pagos en línea y una
          plataforma para ver tus horarios y clases. Mientras tanto, seguimos formando
          instructores de yoga.
        </p>
      </div>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 rounded-full bg-clay-dark px-8 py-4 text-lg font-medium text-white shadow-lg transition hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay-dark"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2a9.93 9.93 0 0 0-8.5 15.07L2 22l5.07-1.5A9.94 9.94 0 1 0 12.04 2Zm5.8 14.1c-.25.7-1.45 1.34-2 1.4-.52.05-1.17.07-1.9-.12a17.3 17.3 0 0 1-1.72-.64c-3-1.3-4.95-4.33-5.1-4.53-.15-.2-1.2-1.6-1.2-3.05s.76-2.16 1.03-2.46c.27-.3.6-.37.8-.37h.58c.19 0 .44-.07.68.52.25.6.85 2.07.92 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.32.38-.45.51-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.05 1.13 1 2.08 1.32 2.38 1.47.3.15.47.12.65-.07.17-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.35.07.12.07.72-.18 1.42Z" />
        </svg>
        Hablar con una asesora sobre certificados
      </a>

      <p className="text-sm text-clay-dark/80">Sedes en Bogotá · Cajicá · Tabio</p>
    </main>
  );
}
