// Catálogo de programas. Los precios son en pesos colombianos (COP), enteros, SIN descuento.
// status "proximamente": se muestra en el sitio pero NO se puede agregar al carrito.
// Lista de lo que hay que revisar/actualizar: docs/PENDIENTES-ACTUALIZAR.md

export type ProgramCategory = "certificacion" | "retiro" | "taller" | "clases";
export type ProgramStatus = "disponible" | "proximamente";

export interface Program {
  slug: string;
  title: string;
  summary: string;
  category: ProgramCategory;
  status: ProgramStatus;
  /** Precio de lista en COP. null = se consulta con una asesora. */
  priceCOP: number | null;
  /** Aclaración del precio, por ejemplo "por pareja". */
  priceNote?: string;
  hours?: number;
}

export const programs: Program[] = [
  {
    slug: "hatha-vinyasa-yoga-y-meditacion",
    title: "Formación en Hatha Vinyasa Yoga y Meditación (300hrs)",
    summary:
      "Esta certificación es para ti si deseas conocerte, recorrer tu cuerpo físico, energético, mental y espiritual y tener herramientas efectivas para tu vida cotidiana.",
    category: "certificacion",
    status: "disponible",
    priceCOP: 3_500_000,
    hours: 300,
  },
  {
    slug: "certificacion-de-yoga-y-pilates",
    title: "Certificación de Yoga y Pilates",
    summary:
      "Doble titulación: fusiona el Hatha Vinyasa Yoga con el método Pilates para desarrollar una consciencia corporal superior.",
    category: "certificacion",
    status: "disponible",
    priceCOP: 3_800_000,
    hours: 250,
  },
  {
    slug: "certificacion-de-yoga-kids",
    title: "Formación de Yoga Kids y Metodologías Alternativas Para La Infancia (200hrs)",
    summary:
      "Dirigida a cualquier profesional vinculado a áreas donde tenga contacto con población infantil.",
    category: "certificacion",
    status: "disponible",
    priceCOP: 2_500_000,
    hours: 200,
  },
  {
    slug: "yoga-prenatal-nacimiento-consciente",
    title: "Abriendo la puerta a la maternidad para vivir un embarazo y nacimiento consciente",
    summary:
      "Taller de yoga gestacional para vivir un embarazo y un nacimiento conscientes, reconectando con la sabiduría natural del cuerpo.",
    category: "taller",
    status: "disponible",
    priceCOP: 800_000,
    priceNote: "por pareja",
  },
  // ---- Próximamente (vencidos o sin precio confirmado) ----
  {
    slug: "inmersion-y-certificacion-de-yoga-en-colombia",
    title: "Inmersión y Certificación de Yoga en Colombia",
    summary:
      "Esta certificación es para ti si deseas conocerte, recorrer tu cuerpo físico, energético, mental y espiritual.",
    category: "certificacion",
    status: "proximamente",
    priceCOP: 2_500_000,
    hours: 200,
  },
  {
    slug: "maestria-yogaayurveda-mujer",
    title: "Maestría Internacional en Hatha Vinyasa Yoga & Ayurveda para la mujer (500h)",
    summary:
      "Para ti, mujer, para que conozcas cada capa de tu ser y despiertes en ti la sabiduría y el poder personal.",
    category: "certificacion",
    status: "proximamente",
    priceCOP: 2_500_000,
    hours: 500,
  },
  {
    slug: "the-happiness-program-3",
    title: "Certificación Internacional en Hatha Vinyasa (200h)",
    summary:
      "Esta certificación es para ti si deseas conocerte, recorrer tu cuerpo físico, energético, mental y espiritual.",
    category: "certificacion",
    status: "proximamente",
    priceCOP: null,
    hours: 200,
  },
  {
    slug: "certificacion-de-yoga-kids-y-yoga-prenatal",
    title: "Certificación de Yoga Kids y Yoga Prenatal",
    summary:
      "Para quienes buscan brindar un acompañamiento tanto a la madre como al ser que viene en camino.",
    category: "certificacion",
    status: "proximamente",
    priceCOP: null,
  },
  {
    slug: "retiro-de-abundancia",
    title: "Retiro de Abundancia",
    summary:
      "Te invitamos a conectar con la abundancia que hay en tu interior y crear la vida que deseas.",
    category: "retiro",
    status: "proximamente",
    priceCOP: 560_000,
  },
  {
    slug: "india",
    title: "Yoga Retreat – India Espiritual",
    summary:
      "¿Alguna vez has pensado practicar yoga en un espacio tan especial y sagrado como la India?",
    category: "retiro",
    status: "proximamente",
    priceCOP: null, // el PDF lo ofrecía en 3.500 USD; falta definir precio en COP o USD
  },
  {
    slug: "clases-presenciales-y-online",
    title: "Clases presenciales y online",
    summary:
      "Clases en nuestras sedes y en línea para encontrar una nueva rutina enfocada en paz y felicidad.",
    category: "clases",
    status: "proximamente",
    priceCOP: null,
  },
];

export function getProgram(slug: string): Program | undefined {
  return programs.find((p) => p.slug === slug);
}

export function isPurchasable(p: Program): p is Program & { priceCOP: number } {
  return p.status === "disponible" && p.priceCOP !== null;
}
