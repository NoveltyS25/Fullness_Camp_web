import Image from "next/image";
import Link from "next/link";
import { WHATSAPP_GENERAL } from "@/lib/whatsapp";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-clay-dark text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
        <div className="space-y-4">
          <Image src="/brand/logo.png" alt="Fullness Camp" width={88} height={83} />
          <p className="max-w-xs">Escuela de formación de instructoras e instructores de yoga y ayurveda.</p>
        </div>

        <div className="space-y-3">
          <h2 className="!text-white font-serif text-xl font-bold">Sedes</h2>
          <ul className="space-y-1">
            <li>Bogotá</li>
            <li>Cajicá</li>
            <li>Tabío</li>
            <li>Online</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="!text-white font-serif text-xl font-bold">Hablemos</h2>
          <p>Lunes a viernes 8 a. m. – 8 p. m.<br />Sábado 8 a. m. – 3 p. m.</p>
          <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="btn bg-white text-clay-dark hover:bg-clay-soft">
            Escribir por WhatsApp
          </a>
          <ul className="space-y-1 pt-2">
            <li><Link href="/programas" className="underline">Programas</Link></li>
            <li><Link href="/contacto" className="underline">Preguntas frecuentes</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/20 px-5 py-5 text-center text-sm">
        © {new Date().getFullYear()} Fullnes Camp International. Todos los derechos reservados.
      </p>
    </footer>
  );
}
