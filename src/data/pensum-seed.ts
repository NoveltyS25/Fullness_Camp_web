/**
 * Pensum inicial de cada certificación (se siembra una sola vez en la base de datos; después lo editan las docentes y la administración).
 * Fuente: PDF de cada programa. Solo se incluyen temas que el PDF nombra; ni horas ni horarios se inventan.
 *
 * Una clase puede traer su temario por encuentros («Clase 1», «Clase 2»…): la docente le pone fecha y hora a cada uno.
 * `teacherEmail` deja la clase asignada a esa docente en cuanto exista su cuenta.
 */
export interface SeedLesson {
  title: string;
  topics: string[];
}

export interface SeedClass {
  title: string;
  teacherEmail?: string;
  lessons?: SeedLesson[];
}

export interface SeedModule {
  title: string;
  topics: (string | SeedClass)[];
}

/** Programa «Anatomía y biomecánica del yoga» (Alexa Pabón), 8 clases. */
export const ANATOMIA_BIOMECANICA: SeedClass = {
  title: "Anatomía y biomecánica del yoga",
  teacherEmail: "alexa24alexa10@gmail.com",
  lessons: [
    {
      title: "Clase 1: Fundamentos y conceptos generales",
      topics: ["Concepto de cuerpo, anatomía y biomecánica", "El centro de gravedad y la alineación", "Planos de movimiento", "Sistemas corporales y su relación con el movimiento"],
    },
    {
      title: "Clase 2: Fundamentos y conceptos generales",
      topics: ["Tipos de movimientos", "Sistema osteoarticular", "Sistema de fascias", "Sistema muscular", "Tipos de contracción muscular"],
    },
    {
      title: "Clase 3: Anatomía y biomecánica de pie, tobillo y rodilla",
      topics: [
        "Huesos y articulaciones de pie, tobillo y rodilla",
        "Músculos y movimientos de pie, tobillo y rodilla",
        "Alteraciones biomecánicas",
        "Alineación en la práctica",
        "Consideraciones anatómicas en la práctica de yoga",
      ],
    },
    {
      title: "Clase 4: Anatomía y biomecánica de cadera y pelvis",
      topics: [
        "Huesos y articulaciones de cadera y pelvis",
        "Músculos y movimientos de cadera y pelvis",
        "Psoas, el músculo del alma",
        "Generalidades del piso pélvico",
        "Alteraciones biomecánicas",
        "Alineación en la práctica",
        "Consideraciones anatómicas en la práctica de yoga",
      ],
    },
    {
      title: "Clase 5: Anatomía y biomecánica de columna vertebral",
      topics: [
        "La columna y su relación con el canal central y los canales energéticos",
        "Componentes de la columna vertebral",
        "Curvaturas",
        "Huesos y articulaciones de columna",
        "Músculos y movimientos de columna vertebral",
        "Alteraciones biomecánicas",
        "Alineación en la práctica",
        "Consideraciones anatómicas en la práctica de yoga",
      ],
    },
    {
      title: "Clase 6: Anatomía y biomecánica de miembros superiores",
      topics: [
        "Huesos y articulaciones de la cintura escapular",
        "Músculos y movimientos de la cintura escapular",
        "El manguito rotador",
        "Huesos y articulaciones del codo y la muñeca",
        "Músculos y movimientos del codo y la muñeca",
        "Las manos",
        "Huesos y articulaciones de las manos",
        "Alteraciones biomecánicas",
        "Alineación en la práctica",
        "Consideraciones anatómicas en la práctica de yoga",
      ],
    },
    {
      title: "Clase 7: Anatomía y fisiología de la respiración",
      topics: [
        "La respiración",
        "Respiración consciente",
        "Componentes del sistema respiratorio",
        "El proceso de la respiración",
        "Patrones respiratorios",
        "Control de la respiración",
        "Factores que afectan la respiración",
        "Consideraciones anatómicas en la práctica de yoga",
      ],
    },
    {
      title: "Clase 8: Integración de conocimientos",
      topics: ["Descripción anatómica de un asana", "Análisis biomecánico de una secuencia", "Alineación en la práctica de un asana", "Evaluación final"],
    },
  ],
};

/** Fundamentos del yoga (Lila Govardhan): 8 clases. El temario de cada una llega después; Lila lo agrega si quiere. */
export const FUNDAMENTOS_DEL_YOGA: SeedClass = {
  title: "Fundamentos del yoga",
  teacherEmail: "academicofullnesscamp@fullnesscamp.com",
  lessons: [
    { title: "Clase 1: Prakriti", topics: [] },
    { title: "Clase 2: La estructura del ser", topics: [] },
    { title: "Clase 3: Anna Yoga, yoga de la alimentación", topics: [] },
    { title: "Clase 4: Principios de alineación", topics: [] },
    { title: "Clase 5: Respiración", topics: [] },
    { title: "Clase 6: Yoga Nidra", topics: [] },
    { title: "Clase 7: Vinyasa", topics: [] },
    { title: "Clase 8: Secuenciación", topics: [] },
  ],
};

/**
 * Marketing digital (Paula Salazar): 6 clases. Cada una trae su tema principal y su objetivo práctico.
 * Se asigna por el correo de su cuenta de administración.
 */
export const MARKETING_DIGITAL: SeedClass = {
  title: "Marketing digital",
  teacherEmail: "noveltystudioscolombia@gmail.com",
  lessons: [
    {
      title: "Clase 1: Fundamentos",
      topics: [
        "El marketing digital en el bienestar y la marca personal",
        "Objetivo práctico: definir el propósito de tu marca (comercial o personal) y entender la diferencia entre vender y conectar",
      ],
    },
    {
      title: "Clase 2: Audiencia",
      topics: [
        "El cliente ideal (avatar) y la propuesta de valor",
        "Objetivo práctico: identificar a quién le hablas (por ejemplo, yoga para el estrés vs. yoga para deportistas) y qué problema resuelves",
      ],
    },
    {
      title: "Clase 3: Contenido",
      topics: [
        "Estrategia de contenidos y pilares de comunicación",
        "Objetivo práctico: crear una parrilla básica de contenido orgánico usando formatos clave (reels, historias, publicaciones educativas)",
      ],
    },
    {
      title: "Clase 4: Ecosistema Meta",
      topics: [
        "Introducción a Meta Business Suite",
        "Objetivo práctico: configurar correctamente tu página de Facebook y tu cuenta profesional de Instagram, y entender dónde vive cada herramienta",
      ],
    },
    {
      title: "Clase 5: Bases de pauta",
      topics: [
        "Administrador de Anuncios vs. el botón «Promocionar»",
        "Objetivo práctico: conocer la estructura de una campaña (campaña, conjunto de anuncios y anuncio) y los principios de segmentación",
      ],
    },
    {
      title: "Clase 6: Lanzamiento",
      topics: [
        "Creación de campaña y lectura de métricas clave",
        "Objetivo práctico: configurar una campaña real de tráfico o interacción con un presupuesto mínimo y aprender a leer los resultados",
      ],
    },
  ],
};

/**
 * Ayurveda se dicta entre dos docentes: esta es la parte de Lila Govardhan (4 clases). La otra parte se agrega cuando se sepa quién la da.
 */
export const AYURVEDA_LILA: SeedClass = {
  title: "Ayurveda: parte de Lila",
  teacherEmail: "academicofullnesscamp@fullnesscamp.com",
  lessons: [
    { title: "Clase 1: Generalidades del Ayurveda", topics: [] },
    { title: "Clase 2: Dinacharya y Ratricharya", topics: ["Dinacharya", "Ratricharya"] },
    { title: "Clase 3: Doshas", topics: [] },
    { title: "Clase 4: Alimentación", topics: [] },
  ],
};

/** Laboratorio de asanas (Lila Govardhan): 8 clases. El temario de cada una llega después; Lila lo agrega si quiere. */
export const LABORATORIO_ASANAS: SeedClass = {
  title: "Laboratorio de asanas",
  teacherEmail: "academicofullnesscamp@fullnesscamp.com",
  lessons: [
    { title: "Clase 1: Surya Namaskara A y B", topics: [] },
    { title: "Clase 2: Asanas de pie", topics: [] },
    { title: "Clase 3: Asanas sentadas", topics: [] },
    { title: "Clase 4: Posturas supinas", topics: [] },
    { title: "Clase 5: Surya Namaskara clásico", topics: [] },
    { title: "Clase 6: Serie de Rishikesh", topics: [] },
    { title: "Clase 7: Formatos (estructura de clase)", topics: [] },
    { title: "Clase 8: Metodología de la enseñanza", topics: [] },
  ],
};

const NITYA = "nitya.portal@gmail.com";

/** Filosofía del yoga (Nitya): 3 módulos; cada tema es una clase que él mismo dicta y a la que le pone horario. */
export const FILOSOFIA_DEL_YOGA: SeedModule[] = [
  {
    title: "Filosofía del yoga: Historia",
    topics: [
      { title: "Cultura Arya y civilización védica: contexto histórico", teacherEmail: NITYA },
      { title: "Yoga: etimología y camino", teacherEmail: NITYA },
    ],
  },
  {
    title: "Filosofía del yoga: Fundamentos",
    topics: [
      { title: "Los 6 Darshanas", teacherEmail: NITYA },
      { title: "Los 4 caminos", teacherEmail: NITYA },
      { title: "Los 8 pasos", teacherEmail: NITYA },
    ],
  },
  {
    title: "Filosofía del yoga: Principios y cosmovisión",
    topics: [
      { title: "Dharma", teacherEmail: NITYA },
      { title: "Karma", teacherEmail: NITYA },
      { title: "Moksha", teacherEmail: NITYA },
      { title: "Brahman", teacherEmail: NITYA },
      { title: "Gunas", teacherEmail: NITYA },
    ],
  },
];

export const PENSUM_SEED: Record<string, SeedModule[]> = {
  "hatha-vinyasa-yoga-y-meditacion": [
    ...FILOSOFIA_DEL_YOGA,
    {
      title: "Fundamentos del yoga",
      topics: [FUNDAMENTOS_DEL_YOGA, ANATOMIA_BIOMECANICA, LABORATORIO_ASANAS],
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
        AYURVEDA_LILA,
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
      topics: ["El yoga como fuente de ingresos y de servicio", MARKETING_DIGITAL],
    },
  ],
};
