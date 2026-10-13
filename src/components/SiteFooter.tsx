import Image from "next/image";
import Link from "next/link";
import { YogaAllianceBadges } from "@/components/YogaAllianceBadges";
import { POLITICAS } from "@/data/politicas";
import { SEDES } from "@/data/sedes";
import { WHATSAPP_GENERAL } from "@/lib/whatsapp";

export function SiteFooter() {
  return (
    <footer className="bg-clay-dark text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Image src="/brand/logo.png" alt="Fullness Camp" width={88} height={83} />
          <p className="max-w-xs">Escuela de formación de instructoras e instructores de yoga y ayurveda.</p>
          <YogaAllianceBadges size={72} />
          <p className="max-w-xs text-sm text-white/80">Escuela registrada RYS 200. Pulsa los sellos para verificar nuestro perfil en Yoga Alliance.</p>
        </div>

        <div className="space-y-3">
          <h2 className="!text-white font-serif text-xl font-bold">Sedes</h2>
          <ul className="space-y-1">
            {SEDES.map((s) => (
              <li key={s.slug}><a href={s.mapUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{s.name}</a></li>
            ))}
            <li>Online</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="!text-white font-serif text-xl font-bold">Políticas</h2>
          <ul className="space-y-1">
            {POLITICAS.map((p) => (
              <li key={p.key}><a href={p.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{p.title}</a></li>
            ))}
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
