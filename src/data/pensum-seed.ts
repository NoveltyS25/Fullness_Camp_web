/**
 * Organización inicial de los 5 certificados (documento «Organización de certificados», octubre de 2026).
 *
 *  - Una ASIGNATURA es lo que dicta una docente y lo que la estudiante aprueba. Sus «Clase 1, 2…» son los encuentros: la docente
 *    le pone fecha y hora a cada uno cuando inicia su ciclo.
 *  - Cada certificado se arma con «Módulo 1», «Módulo 2»… y dentro de cada módulo van asignaturas.
 *  - Una misma asignatura puede estar en varios certificados y se dicta una sola vez: no se duplica.
 *  - `teacherEmail` deja la asignatura a nombre de esa docente en cuanto exista su cuenta; `coTeacherEmails`, las demás docentes.
 *  - `event`: retiros y talleres presenciales; sus fechas se ponen en cualquier momento (sin ciclo).
 */
export interface SeedLesson {
  title: string;
  topics: string[];
}

export interface SeedAsignatura {
  title: string;
  teacherEmail: string;
  coTeacherEmails?: string[];
  modality?: "presencial" | "virtual" | "mixta";
  event?: boolean;
  description?: string;
  lessons?: SeedLesson[];
}

const LILA = "academicofullnesscamp@fullnesscamp.com";
const NITYA = "nitya.portal@gmail.com";
const ALEXA = "alexa24alexa10@gmail.com";
const PAULA = "noveltystudioscolombia@gmail.com";
const WILLIAM = "williamferagotto@gmail.com";
const ANDRES = "nayro81@hotmail.com";
const SUSANA = "martnz.susana@gmail.com";
const DIANA_H = "caritoherrera20@gmail.com";
const DIANA_F = "flormoramar6@gmail.com";
const CELI = "dracelymargarita@gmail.com";

const clases = (items: [string, string[]?][]): SeedLesson[] => items.map(([title, topics], i) => ({ title: `Clase ${i + 1}: ${title}`, topics: topics ?? [] }));

export const ASIGNATURAS: Record<string, SeedAsignatura> = {
  historia_filosofia: {
    title: "Historia y filosofía",
    teacherEmail: NITYA,
    lessons: clases([
      ["Cultura Arya y civilización védica: contexto histórico", ["Sección: Historia"]],
      ["Yoga: etimología y camino", ["Sección: Historia"]],
      ["Los 6 Darshanas", ["Sección: Fundamentos"]],
      ["Los 4 caminos", ["Sección: Fundamentos"]],
      ["Los 8 pasos", ["Sección: Fundamentos"]],
      ["Dharma", ["Sección: Principios y cosmovisión"]],
      ["Karma", ["Sección: Principios y cosmovisión"]],
      ["Moksha", ["Sección: Principios y cosmovisión"]],
      ["Brahman", ["Sección: Principios y cosmovisión"]],
      ["Gunas", ["Sección: Principios y cosmovisión"]],
    ]),
  },
  biomecanica: {
    title: "Biomecánica aplicada al yoga",
    teacherEmail: ALEXA,
    lessons: clases([
      ["Fundamentos y conceptos generales", ["Concepto de cuerpo, anatomía y biomecánica", "El centro de gravedad y la alineación", "Planos de movimiento", "Sistemas corporales y su relación con el movimiento"]],
      ["Fundamentos y conceptos generales", ["Tipos de movimientos", "Sistema osteoarticular", "Sistema de fascias", "Sistema muscular", "Tipos de contracción muscular"]],
      ["Anatomía y biomecánica de pie, tobillo y rodilla", ["Huesos y articulaciones de pie, tobillo y rodilla", "Músculos y movimientos de pie, tobillo y rodilla", "Alteraciones biomecánicas", "Alineación en la práctica", "Consideraciones anatómicas en la práctica de yoga"]],
      ["Anatomía y biomecánica de cadera y pelvis", ["Huesos y articulaciones de cadera y pelvis", "Músculos y movimientos de cadera y pelvis", "Psoas, el músculo del alma", "Generalidades del piso pélvico", "Alteraciones biomecánicas", "Alineación en la práctica", "Consideraciones anatómicas en la práctica de yoga"]],
      ["Anatomía y biomecánica de columna vertebral", ["La columna y su relación con el canal central y los canales energéticos", "Componentes de la columna vertebral", "Curvaturas", "Huesos y articulaciones de columna", "Músculos y movimientos de columna vertebral", "Alteraciones biomecánicas", "Alineación en la práctica", "Consideraciones anatómicas en la práctica de yoga"]],
      ["Anatomía y biomecánica de miembros superiores", ["Huesos y articulaciones de la cintura escapular", "Músculos y movimientos de la cintura escapular", "El manguito rotador", "Huesos y articulaciones del codo y la muñeca", "Músculos y movimientos del codo y la muñeca", "Las manos", "Huesos y articulaciones de las manos", "Alteraciones biomecánicas", "Alineación en la práctica", "Consideraciones anatómicas en la práctica de yoga"]],
      ["Anatomía y fisiología de la respiración", ["La respiración", "Respiración consciente", "Componentes del sistema respiratorio", "El proceso de la respiración", "Patrones respiratorios", "Control de la respiración", "Factores que afectan la respiración", "Consideraciones anatómicas en la práctica de yoga"]],
      ["Integración de conocimientos", ["Descripción anatómica de un asana", "Análisis biomecánico de una secuencia", "Alineación en la práctica de un asana", "Evaluación final"]],
    ]),
  },
  laboratorio_asanas: {
    title: "Laboratorio de asanas",
    teacherEmail: LILA,
    lessons: clases([["Surya Namaskara A y B"], ["Asanas de pie"], ["Asanas sentadas"], ["Posturas supinas"], ["Surya Namaskara clásico"], ["Serie de Rishikesh"], ["Formatos (estructura de clase)"], ["Metodología de la enseñanza"]]),
  },
  fundamentos_yoga: {
    title: "Fundamentos del yoga",
    teacherEmail: LILA,
    description: "Incluye pranayamas (técnicas de respiración), mudras (activación energética), mantras (cantos para elevar la vibración), bandhas (candados energéticos), kriyas (técnicas de limpieza o detox), doshas y gunas, y técnicas de meditación.",
    lessons: clases([["Prakriti"], ["La estructura del ser"], ["Anna Yoga, yoga de la alimentación / Pranas, koshas, nadis y chakras"], ["Principios de alineación"], ["Respiración"], ["Yoga Nidra"], ["Vinyasa"], ["Secuenciación"]]),
  },
  intro_ayurveda: {
    title: "Introducción al Ayurveda",
    teacherEmail: LILA,
    lessons: clases([["Generalidades del Ayurveda"], ["Dinacharya y Ratricharya", ["Dinacharya", "Ratricharya"]], ["Doshas"], ["Alimentación"]]),
  },
  integracion_emocional: {
    title: "Integración emocional",
    teacherEmail: LILA,
    lessons: clases([["Integración emocional", ["Integración emocional"]], ["Autocontención (Swastya) y amor propio", ["Divino autocontención: Swastya", "Técnicas de empoderamiento y amor propio"]]]),
  },
  marketing: {
    title: "El yoga como fuente de ingresos y de servicio",
    teacherEmail: PAULA,
    description: "Marketing digital con Paula Salazar. Ciclo de un mes: una clase por semana.",
    lessons: clases([
      ["Fundamentos y Audiencia", ["Marca personal en el bienestar, cliente ideal (avatar) y propuesta de valor"]],
      ["Contenido", ["Estrategia de contenidos, pilares de comunicación y estructura de publicaciones"]],
      ["Ecosistema Meta y bases de pauta", ["Meta Business Suite, Administrador de Anuncios vs. botón «Promocionar» y segmentación"]],
      ["Lanzamiento y métricas", ["Creación de campaña en vivo, publicación y lectura de resultados clave"]],
    ]),
  },
  meditacion_respiracion: {
    title: "Meditación y respiración",
    teacherEmail: WILLIAM,
    lessons: clases([["Introducción a la meditación"], ["Respiración"], ["Yoga nidra"], ["Tratak"], ["Meditación método Silva"], ["Meditación en los chakras"], ["Meditación en la sanación"], ["Meditación en los mantras"]]),
  },
  pilates: {
    title: "Pilates",
    teacherEmail: ANDRES,
    description: "Online. Ciclo de 3 meses con Andrés Díaz: 4 clases de Pilates piso, 4 de mini balón y theraband, y 4 de aro mágico y balón de 60 cm.",
    lessons: clases([
      ["Pilates piso", ["Bloque 1: Pilates piso"]], ["Pilates piso", ["Bloque 1: Pilates piso"]], ["Pilates piso", ["Bloque 1: Pilates piso"]], ["Pilates piso", ["Bloque 1: Pilates piso"]],
      ["Mini balón y theraband", ["Bloque 2"]], ["Mini balón y theraband", ["Bloque 2"]], ["Mini balón y theraband", ["Bloque 2"]], ["Mini balón y theraband", ["Bloque 2"]],
      ["Aro mágico y balón de 60 cm", ["Bloque 3"]], ["Aro mágico y balón de 60 cm", ["Bloque 3"]], ["Aro mágico y balón de 60 cm", ["Bloque 3"]], ["Aro mágico y balón de 60 cm", ["Bloque 3"]],
    ]),
  },
  yoga_gestacional: {
    title: "Yoga gestacional",
    teacherEmail: LILA,
    description: "Una clase por cada trimestre del embarazo.",
    lessons: clases([["Primer trimestre"], ["Segundo trimestre"], ["Tercer trimestre"]]),
  },
  yoga_postnatal: {
    title: "Yoga post natal",
    teacherEmail: LILA,
    lessons: clases([["Yoga post natal"], ["Trabajo de lactancia y parto yoga"]]),
  },
  hipopresivos: {
    title: "Hipopresivos",
    teacherEmail: SUSANA,
    lessons: clases([["Clase teórica de hipopresivos"], ["Clase práctica de hipopresivos"]]),
  },
  parto_humanizado: {
    title: "Parto humanizado y maternidad consciente",
    teacherEmail: DIANA_H,
    lessons: clases([["Parto humanizado y maternidad consciente"]]),
  },
  medicina_ayurveda: {
    title: "Fundamentos de medicina Ayurveda",
    teacherEmail: CELI,
    lessons: clases([
      ["Ayurveda para la mujer"], ["Rasayana"], ["Ciclo femenino"], ["Alteraciones del ciclo femenino"], ["Ayurveda durante la gestación"],
      ["Parto y posparto (Ayurveda, puerperio)"], ["Climaterio, aborto y abuso sexual"],
    ]),
  },
  yoga_kids_practico: {
    title: "Yoga kids (práctico)",
    teacherEmail: DIANA_F,
    event: true,
    modality: "presencial",
    description: "Un fin de semana de práctica (3 días).",
    lessons: clases([["Práctica, día 1"], ["Práctica, día 2"], ["Práctica, día 3"]]),
  },
  yoga_ninos_virtual: {
    title: "El yoga para niños en la virtualidad",
    teacherEmail: DIANA_F,
  },
  retiro_kids: {
    title: "Retiro de Yoga Kids y Prenatal",
    teacherEmail: LILA,
    coTeacherEmails: [DIANA_F],
    event: true,
    modality: "presencial",
    description: "Retiro de 2 o 3 días, muy práctico. Lo dirigen Lila y, según el retiro, Diana Flores.",
    lessons: clases([["Mamá y bebé"], ["Yoga porteo"], ["Yoga para la familia"]]),
  },
  retiro_hatha200: {
    title: "Retiro de Hatha Vinyasa (200 h)",
    teacherEmail: LILA,
    event: true,
    modality: "presencial",
    description: "Retiro de 2 o 3 días, muy práctico.",
  },
  retiro_pilates: {
    title: "Retiro de yoga y Pilates",
    teacherEmail: LILA,
    event: true,
    modality: "presencial",
    description: "Retiro de 2 o 3 días, muy práctico. Yoga de la alimentación: 2 talleres de cocina ayurveda creativa.",
    lessons: clases([["Taller de cocina ayurveda creativa 1"], ["Taller de cocina ayurveda creativa 2"]]),
  },
  retiro_hatha300: {
    title: "Retiro de yoga y meditación",
    teacherEmail: LILA,
    event: true,
    modality: "presencial",
    description: "Retiro de 2 o 3 días, muy práctico. Yoga de la alimentación: 2 talleres de cocina ayurveda creativa.",
    lessons: clases([["Taller de cocina ayurveda creativa 1"], ["Taller de cocina ayurveda creativa 2"]]),
  },
  retiro_rasayana: {
    title: "Retiro Rasayana (rejuvenecimiento)",
    teacherEmail: LILA,
    event: true,
    modality: "presencial",
    lessons: clases([["Rasayana: terapias de rejuvenecimiento", ["Terapias de rejuvenecimiento desde la medicina Ayurveda", "Posturas de yoga", "Yoga facial", "Salud hormonal", "Herbolaria (plantas medicinales) para mantener la salud femenina"]]]),
  },
  cosmetica_natural: {
    title: "Cosmética natural",
    teacherEmail: LILA,
    coTeacherEmails: [WILLIAM],
    event: true,
    modality: "presencial",
    lessons: clases([
      ["Beneficios e introducción a la cosmética natural"],
      ["Laboratorio de cosmética natural", ["Productos que se asemejan al manto lipídico de la piel con ingredientes naturales de alta afinidad", "Cosmética slow y rutinas de belleza", "Taller de productos naturales"]],
    ]),
  },
  linaje_femenino: {
    title: "Taller presencial: Entendiendo nuestro linaje femenino",
    teacherEmail: LILA,
    event: true,
    modality: "presencial",
    description: "Círculo de mujeres.",
    lessons: clases([["Linaje femenino: reconociendo nuestro poder divino", ["Autocontención: Swastya", "Integración emocional", "Técnicas de empoderamiento y amor propio"]]]),
  },
  ciclo_lunar: {
    title: "Ciclo lunar: 16 meditaciones",
    teacherEmail: LILA,
    coTeacherEmails: [CELI],
    description:
      "Meditaciones en línea dirigidas por Lila y la Dra. Celi. El ciclo menstrual como fuente de energías creativas, espirituales, sexuales, emocionales, mentales y físicas; yoga para cada fase del ciclo; Ayurveda, herbolaria y aromaterapia para la salud hormonal; climaterio.",
    lessons: Array.from({ length: 16 }, (_, i) => ({ title: `Meditación ${i + 1}`, topics: [] })),
  },
  tantra: {
    title: "Tantra yoga",
    teacherEmail: WILLIAM,
    lessons: clases([["Tantra yoga y huevos yoni"]]),
  },
};

/** Certificado (slug del catálogo) → módulos → claves de asignaturas. El módulo i se llama «Módulo i+1». */
export const CERTIFICACIONES: Record<string, string[][]> = {
  "certificacion-de-yoga-kids-y-yoga-prenatal": [
    ["yoga_gestacional"], ["yoga_postnatal"], ["hipopresivos"], ["parto_humanizado"], ["intro_ayurveda"], ["medicina_ayurveda"],
    ["yoga_kids_practico"], ["yoga_ninos_virtual"], ["marketing"], ["retiro_kids"],
  ],
  "the-happiness-program-3": [
    ["historia_filosofia"], ["biomecanica"], ["laboratorio_asanas"], ["fundamentos_yoga"], ["intro_ayurveda"], ["integracion_emocional"], ["marketing"], ["retiro_hatha200"],
  ],
  "certificacion-de-yoga-y-pilates": [
    ["historia_filosofia"], ["biomecanica"], ["laboratorio_asanas"], ["fundamentos_yoga"], ["intro_ayurveda"], ["integracion_emocional"], ["marketing"], ["pilates"], ["retiro_pilates"],
  ],
  "hatha-vinyasa-yoga-y-meditacion": [
    ["historia_filosofia"], ["biomecanica"], ["laboratorio_asanas"], ["fundamentos_yoga"], ["intro_ayurveda"], ["meditacion_respiracion"], ["marketing"], ["retiro_hatha300"],
  ],
  "maestria-yogaayurveda-mujer": [
    ["fundamentos_yoga", "intro_ayurveda", "medicina_ayurveda"], ["yoga_gestacional"], ["retiro_rasayana"], ["cosmetica_natural"], ["linaje_femenino"], ["ciclo_lunar"], ["tantra"],
  ],
};
