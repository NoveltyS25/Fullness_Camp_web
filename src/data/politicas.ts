/**
 * Contrato y políticas de la escuela (PDF en public/politicas). Para actualizar una, se reemplaza el PDF con el mismo nombre
 * (y si cambia su contenido, se sube la versión en VERSION_POLITICAS: así se sabe cuál aceptó cada persona).
 * Orden: primero lo que afecta la compra, luego lo de convivencia y quejas.
 */
export type PoliticaKey =
  | "contrato"
  | "general"
  | "profesorados"
  | "talleres"
  | "retiros"
  | "clases"
  | "asistencia"
  | "antiacoso"
  | "antirepresalias"
  | "quejas";

export interface Politica {
  key: PoliticaKey;
  title: string;
  href: string;
  /** "matricula": contrato y reglas de compra, cancelación y reembolso. "convivencia": conducta, asistencia y quejas. */
  group: "matricula" | "convivencia";
}

export const POLITICAS: Politica[] = [
  { key: "contrato", title: "Contrato de prestación de servicios formativos y de bienestar", href: "/politicas/contrato-matriz-de-prestacion-de-servicios.pdf", group: "matricula" },
  { key: "general", title: "Política general de matrícula, cancelación y reembolso", href: "/politicas/politica-general-de-matricula-cancelacion-y-reembolso.pdf", group: "matricula" },
  { key: "profesorados", title: "Política para profesorados y formaciones de larga duración", href: "/politicas/politica-profesorados-y-formaciones-de-larga-duracion.pdf", group: "matricula" },
  { key: "talleres", title: "Política para talleres cortos", href: "/politicas/politica-talleres-cortos.pdf", group: "matricula" },
  { key: "retiros", title: "Política para retiros de fin de semana", href: "/politicas/politica-retiros-de-fin-de-semana.pdf", group: "matricula" },
  { key: "clases", title: "Política para clases sueltas y tiqueteras", href: "/politicas/politica-clases-sueltas-y-tiqueteras.pdf", group: "matricula" },
  { key: "asistencia", title: "Política de asistencia", href: "/politicas/politica-de-asistencia.pdf", group: "convivencia" },
  { key: "antiacoso", title: "Política anti-acoso", href: "/politicas/politica-anti-acoso.pdf", group: "convivencia" },
  { key: "antirepresalias", title: "Política anti-represalias", href: "/politicas/politica-anti-represalias.pdf", group: "convivencia" },
  { key: "quejas", title: "Política de quejas", href: "/politicas/politica-de-quejas.pdf", group: "convivencia" },
];

export const politica = (key: PoliticaKey): Politica => POLITICAS.find((p) => p.key === key)!;

/** Política específica que aplica a cada tipo de programa. */
export const POLITICA_POR_CATEGORIA = {
  certificacion: "profesorados",
  taller: "talleres",
  retiro: "retiros",
  clases: "clases",
} as const satisfies Record<string, PoliticaKey>;

/** Perfil público verificable de la escuela en Yoga Alliance. */
export const YOGA_ALLIANCE_URL = "https://app.yogaalliance.org/schoolpublicprofile/001Kf00000qEjzbIAC/fullness-camp-sede-tabio";
