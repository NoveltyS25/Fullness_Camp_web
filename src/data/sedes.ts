/**
 * Sedes de Fullness Camp. Los textos salen de las páginas de sedes del sitio anterior y cada foto es de la sede
 * indicada (se verificó con las páginas originales). Las direcciones exactas se abren desde el enlace de Google Maps.
 */
export interface Sede {
  slug: "bogota" | "cajica" | "tabio";
  name: string;
  tagline: string;
  text: string;
  ideal: string;
  mapUrl: string;
  photo: { src: string; alt: string; position?: string };
}

export const SEDES: Sede[] = [
  {
    slug: "bogota",
    name: "Bogotá",
    tagline: "Yoga urbano y profesional",
    text: "Espacios amplios, luz natural y todas las herramientas para que tu práctica sea segura, profunda y transformadora, con un equipo docente liderado por Lila Govardhan.",
    ideal: "Clases semanales y certificaciones",
    mapUrl: "https://maps.app.goo.gl/qtVQMQ57Xv2UzntcA",
    photo: { src: "/images/2026_04_IMG_9106-scaled.jpg", alt: "Estudiantes practicando respiración consciente en el salón de la sede de Bogotá", position: "35% 60%" },
  },
  {
    slug: "cajica",
    name: "Cajicá",
    tagline: "Grupos reducidos, atención personalizada",
    text: "Un ambiente profesional, seguro y pensado para tu evolución física y mental, para quienes viven o trabajan en la zona.",
    ideal: "Certificaciones de yoga y pilates",
    mapUrl: "https://maps.app.goo.gl/nKxzmirpiRnpWy7p6",
    photo: { src: "/images/2026_04_IMG_2898-scaled.jpg", alt: "Mujer practicando yoga en el salón con arcos de la sede de Cajicá", position: "50% 40%" },
  },
  {
    slug: "tabio",
    name: "Tabío",
    tagline: "Naturaleza y domo geodésico",
    text: "Sumerge tu práctica en el silencio de las montañas. Nuestra sede campestre tiene un domo geodésico de geometría sagrada, el escenario perfecto para vivir retiros profundos.",
    ideal: "Retiros espirituales y formación intensiva",
    mapUrl: "https://maps.app.goo.gl/Gh7g4RLnQaeAcBoy5",
    photo: { src: "/images/2026_03_IMG_7580.jpg", alt: "Grupo practicando yoga dentro del domo geodésico de Tabío", position: "50% 55%" },
  },
];
