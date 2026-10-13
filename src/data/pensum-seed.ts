/**
 * Pensum inicial de cada certificación (se siembra una sola vez en la base de datos; después lo editan las docentes y la administración).
 * Fuente: PDF de cada programa. Solo se incluyen temas que el PDF nombra; ni horas ni docentes se inventan:
 * cada docente se asigna a sus temas desde el campus.
 */
export interface SeedModule {
  title: string;
  topics: string[];
}

export const PENSUM_SEED: Record<string, SeedModule[]> = {
  "hatha-vinyasa-yoga-y-meditacion": [
    {
      title: "Fundamentos del yoga",
      topics: ["Historia y filosofía", "Biomecánica aplicada al yoga", "Asanas: alineación, beneficios y secuencias"],
    },
    {
      title: "Cuerpo energético",
      topics: [
        "Pranas, koshas, nadis y chakras",
        "Chakras, nadis y energía kundalini",
        "Pranayamas (técnicas de respiración)",
        "Mudras (activación energética y posturas con las manos)",
        "Mantras (cantos para la elevación de la vibración)",
        "Bandhas (candados energéticos)",
        "Kriyas (técnicas de limpieza y detox)",
      ],
    },
    {
      title: "Ayurveda y yoga de la alimentación",
      topics: [
        "Introducción a la medicina Ayurveda (medicina tradicional de la India)",
        "Doshas y gunas",
        "Taller de cocina ayurveda creativa 1",
        "Taller de cocina ayurveda creativa 2",
      ],
    },
    {
      title: "Cuerpo mental y meditación",
      topics: [
        "Cómo funciona nuestro cerebro",
        "Técnicas de meditación",
        "Meditaciones activas (mándalas y geometría sagrada)",
        "Carga de los 5 elementos",
        "Meditaciones en las virtudes",
      ],
    },
    {
      title: "Integración emocional",
      topics: ["Integración emocional", "Divino autocontención: Swastya", "Técnicas de empoderamiento y amor propio"],
    },
    {
      title: "El yoga como camino de vida",
      topics: ["El yoga como fuente de ingresos y de servicio"],
    },
  ],
};
