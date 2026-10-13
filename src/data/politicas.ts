/**
 * Políticas de la escuela (PDF en public/politicas). Para actualizar una, se reemplaza el PDF con el mismo nombre.
 * Orden: primero las que afectan la compra y el estudio, luego las de convivencia y quejas.
 */
export interface Politica {
  key: "reembolso" | "asistencia" | "antiacoso" | "antirepresalias" | "quejas";
  title: string;
  href: string;
}

export const POLITICAS: Politica[] = [
  { key: "reembolso", title: "Política de matrícula y reembolso", href: "/politicas/politica-de-matricula-y-reembolso.pdf" },
  { key: "asistencia", title: "Política de asistencia", href: "/politicas/politica-de-asistencia.pdf" },
  { key: "antiacoso", title: "Política anti-acoso", href: "/politicas/politica-anti-acoso.pdf" },
  { key: "antirepresalias", title: "Política anti-represalias", href: "/politicas/politica-anti-represalias.pdf" },
  { key: "quejas", title: "Política de quejas", href: "/politicas/politica-de-quejas.pdf" },
];

export const politica = (key: Politica["key"]): Politica => POLITICAS.find((p) => p.key === key)!;

/** Perfil público verificable de la escuela en Yoga Alliance. */
export const YOGA_ALLIANCE_URL = "https://app.yogaalliance.org/schoolpublicprofile/001Kf00000qEjzbIAC/fullness-camp-sede-tabio";
