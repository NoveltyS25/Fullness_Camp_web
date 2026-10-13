import Image from "next/image";
import { YOGA_ALLIANCE_URL } from "@/data/politicas";

/**
 * Sellos RYS 200 de Yoga Alliance. Al pulsarlos se abre el perfil público de la escuela en Yoga Alliance,
 * donde cualquier persona puede verificar el registro.
 */
export function YogaAllianceBadges({ size = 72, className = "" }: { size?: number; className?: string }) {
  return (
    <a
      href={YOGA_ALLIANCE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Verificar a Fullness Camp en el perfil público de Yoga Alliance (se abre en una pestaña nueva)"
      className={`inline-flex shrink-0 items-center gap-2 rounded-full transition hover:scale-105 ${className}`}
    >
      <Image src="/brand/rys200-negro.png" alt="Sello Registered Yoga School RYS 200 de Yoga Alliance" width={size} height={size} />
      <Image src="/brand/rys200-naranja.png" alt="Sello RYS 200 Yoga Alliance" width={size} height={size} />
    </a>
  );
}
