/**
 * Contenido de las landing pages de cada programa. Todo sale de los PDF y de las páginas actuales del sitio:
 * no se inventan cifras, testimonios ni credenciales. Lo que falta por confirmar está marcado con
 * "por confirmar" y listado en docs/PENDIENTES-ACTUALIZAR.md.
 */

export interface Teacher {
  name: string;
  role: string;
  bio: string;
  photo?: string;
}

export interface Testimonial {
  quote: string;
  author: string;
}

export type FactIcon = "clock" | "laptop" | "pin" | "calendar" | "award" | "users" | "gift" | "mountain";

export interface Fact {
  icon: FactIcon;
  label: string;
  value: string;
  detail?: string;
}

export interface Landing {
  /** Frase corta sobre el título (tipo de programa y duración). */
  kicker: string;
  headline: string;
  subheadline: string;
  /** Tres datos de confianza bajo el título. */
  proof: string[];
  heroImage: { src: string; alt: string; position?: string };
  seo: { title: string; description: string };
  /** Datos rápidos (4 por programa). Valor corto en una línea y, si ayuda, un detalle breve debajo. */
  facts: Fact[];
  audience: string[];
  /** Quién NO necesita nada previo / aclaraciones para que la compra sea de buen ajuste. */
  prerequisites: string;
  outcomes: { title: string; text: string }[];
  /** Cada bloque se muestra como una pregunta (question) que se abre con el detalle. */
  curriculum: { title: string; question?: string; items: string[] }[];
  teachers: Teacher[];
  schedule: { title: string; lines: string[] }[];
  includes: string[];
  requirements: string[];
  faq: { q: string; a: string }[];
  /** Si hay revista (flipbook) generada en public/revistas/<slug>. */
  magazine: boolean;
  testimonials?: Testimonial[];
}

// ------------------------------------------------------------------ equipo (sale de la página «Nosotros»)

export const TEAM = {
  lila: {
    name: "Lila Govardhan",
    role: "Directora de la escuela · Maestra E-RYT 500",
    photo: "/images/2023_04_Lila.png.webp",
    bio: "Más de 20 años de experiencia en yoga y más de 7.000 horas de docencia. Formadora en Hatha Vinyasa, Yoga para la Mujer, Terapéutico, Kids y Prenatal. Certificada como Teacher Training de 1.000 horas y reconocida como Maestra Experimentada (E-RYT 500) por Yoga Alliance en 2024.",
  },
  cely: {
    name: "Dra. Cely Margarita Arengas",
    role: "Médica cirujana · Medicina Ayurveda",
    photo: "/images/2026_03_1.png",
    bio: "Médica cirujana de la Universidad Nacional, diplomada en Medicina Ayurveda. Con formación en Hatha Yoga, Yoga Aéreo, Yoga-Pilates y Yoga Kids, es el puente entre la ciencia médica y la práctica del yoga.",
  },
  maria: {
    name: "María Alexandra Pabón Sánchez",
    role: "Fisioterapeuta · Anatomía en yoga",
    photo: "/images/2026_03_3.png",
    bio: "Fisioterapeuta especialista con certificaciones en yoga y pilates. Te guía hacia una práctica libre de lesiones, con la anatomía y la salud física como prioridad.",
  },
  daniel: {
    name: "Daniel Eduardo Angulo Olarte",
    role: "Fisioterapia y Pilates clínico",
    photo: "/images/2026_03_2.png",
    bio: "Más de una década de trayectoria en movimiento consciente. Une la precisión de la fisioterapia con la fluidez del yoga y el pilates para que entiendas la biomecánica detrás de cada práctica.",
  },
  william: {
    name: "William Feragotto",
    role: "Instructor senior · Co-creador del Ice Yoga Method",
    photo: "/images/2026_04_William-Feragotto-1.jpg",
    bio: "Músico terapeuta y docente de meditación con mantras. Instructor certificado Nivel 2 del Método Wim Hof y co-creador del Ice Yoga Method: respiración, mente y exposición al frío en un entorno seguro.",
  },
} satisfies Record<string, Teacher>;

// ------------------------------------------------------------------ reseñas reales de Google (página «Nosotros»)

const RESENAS = {
  adriana: {
    quote: "Estoy haciendo mi formación en yoga y pilates con Fullness y ha sido la experiencia más bonita que he tenido en mi camino de autodescubrimiento. Lila es una persona bellísima, sabia y con muchas ganas de compartir todos sus conocimientos.",
    author: "Adriana Buzon · reseña en Google",
  },
  camila: {
    quote: "La mejor escuela para hacer tu certificación. Los mejores meses de mi vida, el programa es muy enriquecedor.",
    author: "Camila Pedraza · reseña en Google",
  },
  luz: {
    quote: "Una escuela de formación que realmente integra en su práctica lo que significa conectar mente, cuerpo y alma.",
    author: "Luz Arango · reseña en Google",
  },
} satisfies Record<string, Testimonial>;

// ------------------------------------------------------------------ preguntas comunes

const FAQ_PAGO = {
  q: "¿Cómo pago y puedo hacerlo en cuotas?",
  a: "Pagas el valor completo en un solo pago con tarjeta y recibes un descuento por pago único. Si prefieres cuotas, puedes diferir el pago con tu banco al pagar con tu tarjeta de crédito.",
};
const FAQ_DESPUES = {
  q: "¿Qué pasa después de pagar?",
  a: "Te llega un correo con un enlace para crear tu contraseña y el paso a paso para entrar al campus virtual con tu cédula. Allí ves tu programa, tu horario y los avisos de tu profesora.",
};
const FAQ_LESION = {
  q: "Tengo una lesión o condición física, ¿puedo participar?",
  a: "Sí. Contamos con una médica cirujana y fisioterapeutas especialistas que supervisan las metodologías para que cada persona viva la práctica de forma segura y a su propio ritmo.",
};
const FAQ_ASESORA = {
  q: "¿Puedo hablar con alguien antes de inscribirme?",
  a: "Claro. Una asesora te orienta por WhatsApp según tu nivel actual, tus objetivos y tu disponibilidad de tiempo.",
};

const HORARIO_BASE = [
  { title: "Clases teóricas · 100 % online (Google Meet)", lines: ["Lunes o martes, 8:00 a 10:00 a. m.", "Lunes o martes, 6:00 a 8:00 p. m."] },
  {
    title: "Clases prácticas · online o presencial",
    lines: [
      "Sede Bogotá: un día entre jueves y viernes, 9:30 a 11:30 a. m. o 6:00 a 8:00 p. m.",
      "Sede Cajicá: miércoles, 9:00 a 11:00 a. m. o 6:00 a 8:00 p. m.",
      "Sede Tabío (campestre): sábados, 8:00 a 10:00 a. m.",
    ],
  },
];

// ------------------------------------------------------------------ programas

export const LANDINGS: Record<string, Landing> = {
  "hatha-vinyasa-yoga-y-meditacion": {
    kicker: "Certificación internacional · 300 horas",
    headline: "Fórmate como instructora de Hatha Vinyasa Yoga y Meditación",
    subheadline: "Un viaje del cuerpo físico al espíritu: aprende a guiar la práctica de otras personas con alineación segura, ayurveda y meditación, y transforma tu propio estilo de vida.",
    proof: ["Diploma internacional avalado por Yoga Alliance", "Docentes con más de 7.000 horas de experiencia", "Sedes en Bogotá, Cajicá y Tabío, y clases online"],
    heroImage: { src: "/images/2026_04_IMG_9106-scaled.jpg", alt: "Estudiantes practicando respiración consciente en el salón de yoga", position: "35% 60%" },
    seo: {
      title: "Certificación en Hatha Vinyasa Yoga y Meditación (300 horas) | Fullness Camp",
      description: "Formación de instructores de Hatha Vinyasa Yoga y Meditación de 300 horas con diploma internacional. Clases online y presenciales en Bogotá, Cajicá y Tabío.",
    },
    facts: [
      { icon: "clock", label: "Duración", value: "300 horas", detail: "Teoría y práctica" },
      { icon: "laptop", label: "Modalidad", value: "Online y presencial", detail: "Teoría online · práctica a elegir" },
      { icon: "pin", label: "Sedes", value: "Bogotá, Cajicá, Tabío", detail: "Clases prácticas presenciales" },
      { icon: "mountain", label: "Retiro", value: "3 días en Tabío", detail: "Un fin de semana" },
    ],
    audience: [
      "Quieres no solo enseñar yoga, sino transformar tu estilo de vida y conocerte a fondo.",
      "Deseas una formación seria, con alineación y seguridad para no lastimar tu cuerpo ni el de otras personas.",
      "Buscas una fuente de ingresos que provenga de lo que amas: el yoga como servicio.",
      "Te atrae la meditación, los mantras, el ayurveda y la integración emocional.",
    ],
    prerequisites: "No necesitas experiencia previa: solo las ganas de aprender.",
    outcomes: [
      { title: "Practicar y guiar con seguridad", text: "Aprendes las posturas (asanas) con la alineación correcta y sus variaciones según la condición física de cada persona, para evitar lesiones." },
      { title: "Diseñar clases con objetivos claros", text: "Entiendes el porqué y el para qué de cada postura, respiración, mudra y mantra, y puedes potenciar sus beneficios." },
      { title: "Conocer tu biotipo (dosha)", text: "Descubres con el ayurveda qué alimentos, qué tipo de yoga y qué horarios de práctica diaria (sadhana) son ideales para ti." },
      { title: "Comer y cocinar mejor", text: "Dos talleres de cocina ayurveda creativa con recetas prácticas y nutritivas para ti y tu familia." },
      { title: "Entender tu mente y tus emociones", text: "Conoces cómo funciona tu mente, por qué sientes lo que sientes y cómo abrazar e integrar tus emociones." },
      { title: "Convertir el yoga en un servicio", text: "Te acompañamos si quieres compartir esta práctica y volverla una fuente de ingresos y de servicio para los demás." },
    ],
    curriculum: [
      {
        title: "Yoga",
        question: "¿Qué voy a aprender de yoga?",
        items: [
          "Historia y filosofía",
          "Biomecánica aplicada al yoga",
          "Asanas: alineación, beneficios y secuencias",
          "Pranas, koshas, nadis y chakras",
          "Pranayamas (respiración), mudras, mantras, bandhas y kriyas (técnicas de limpieza)",
          "Doshas y gunas",
          "Yoga de la alimentación: 2 talleres de cocina ayurveda creativa",
          "Integración emocional",
          "El yoga como fuente de ingresos y de servicio",
        ],
      },
      {
        title: "Meditación",
        question: "¿Qué técnicas de meditación voy a aprender?",
        items: [
          "Cuerpo energético: chakras, nadis y energía kundalini",
          "Cuerpo mental: cómo funciona nuestro cerebro y técnicas de meditación",
          "Meditaciones activas (mándalas y geometría sagrada)",
          "Carga de los 5 elementos y meditaciones en las virtudes",
          "Autocontención (Swastya) e integración emocional",
          "Técnicas de empoderamiento y amor propio",
        ],
      },
      { title: "Introducción a la medicina ayurveda", question: "¿Qué voy a aprender de ayurveda?", items: ["Medicina tradicional de la India", "Constitución (dosha) y hábitos de vida", "Alimentación ancestral del territorio andino"] },
    ],
    teachers: [TEAM.lila, TEAM.william],
    schedule: HORARIO_BASE,
    includes: [
      "Memorias de la formación en PDF y el libro «Yoga in Action» de Geeta S. Iyengar",
      "El Bhagavad Gita en PDF",
      "Suscripción a la plataforma Gaia por 6 meses sin costo adicional",
      "Membresía 2026 a las clases activas online y presenciales en las sedes de la escuela",
      "Clases en vivo por plataforma, donde puedes participar, preguntar y debatir",
      "Diploma internacional avalado por Yoga Alliance",
    ],
    requirements: [
      "Asistir a las 180 horas de formación práctica y teórica.",
      "Asistir al retiro de 3 días (fin de semana en Tabío).",
      "Asistir a las clases online de la formación.",
      "Realizar la tesina y las demás tareas.",
    ],
    faq: [
      { q: "¿Qué diploma recibo?", a: "Un diploma internacional avalado por Yoga Alliance, que te permite dar clases y guiar la práctica de otras personas." },
      FAQ_PAGO,
      FAQ_DESPUES,
      FAQ_LESION,
      FAQ_ASESORA,
    ],
    magazine: true,
    testimonials: [RESENAS.camila, RESENAS.luz],
  },

  "certificacion-de-yoga-y-pilates": {
    kicker: "Doble titulación · 250 horas",
    headline: "Certifícate en Yoga y Pilates y domina el equilibrio y la fuerza funcional",
    subheadline: "Une el Hatha Vinyasa Yoga con el método Pilates para desarrollar una consciencia corporal superior, con enfoque biomecánico y el respaldo de expertas en fisioterapia y medicina.",
    proof: ["Doble titulación: yoga y pilates", "Aval internacional de Yoga Alliance", "Directora con credencial E-RYT 500"],
    heroImage: { src: "/images/2026_04_IMG_2165-scaled.jpg", alt: "Estudiante en una postura de equilibrio frente a una pared con luz cálida", position: "50% 40%" },
    seo: {
      title: "Certificación en Yoga y Pilates (250 horas) | Fullness Camp",
      description: "Formación de instructores de Hatha Vinyasa Yoga y Pilates de 250 horas con doble titulación y enfoque biomecánico. Online y presencial en Bogotá, Cajicá y Tabío.",
    },
    facts: [
      { icon: "clock", label: "Duración", value: "250 horas", detail: "Teoría y práctica" },
      { icon: "award", label: "Titulación", value: "Doble titulación", detail: "Yoga y Pilates" },
      { icon: "laptop", label: "Modalidad", value: "Online y presencial", detail: "Teoría online · práctica a elegir" },
      { icon: "pin", label: "Sedes", value: "Bogotá, Cajicá, Tabío", detail: "Clases prácticas presenciales" },
    ],
    audience: [
      "Quieres ampliar tu oferta profesional con dos disciplinas: yoga y pilates.",
      "Te interesa entender la anatomía aplicada y fortalecer tu cuerpo desde adentro hacia afuera.",
      "Buscas una formación técnica y espiritual de alto nivel para guiar a otras personas.",
      "Te apasiona el movimiento y quieres una práctica segura, libre de lesiones.",
    ],
    prerequisites: "No requiere experiencia previa: nuestra metodología es multinivel.",
    outcomes: [
      { title: "Doble titulación", text: "Obtienes certificación de yoga y de pilates, ampliando tus oportunidades en el mercado del bienestar." },
      { title: "Fortalecer tu core", text: "Desarrollas una consciencia corporal superior para aplicar correctamente las llaves energéticas (bandhas) y potenciar cada asana." },
      { title: "Enfoque biomecánico", text: "Aprendes con expertas en fisioterapia y medicina para una práctica segura, y a entrenar en condiciones especiales (patologías específicas)." },
      { title: "Diseñar y enseñar clases", text: "Aprendes metodología de la enseñanza y ética profesional para diseñar clases de yoga y pilates." },
      { title: "Conocer tu biotipo (dosha)", text: "Descubres con el ayurveda qué alimentos y qué tipo de yoga te benefician más, y te acercas a una alimentación saludable con 2 talleres de cocina." },
      { title: "Seguir practicando después de graduarte", text: "Si cumples con todo, puedes asistir a las clases activas de la escuela durante todo el año sin costo adicional." },
    ],
    curriculum: [
      {
        title: "Contenido de yoga",
        question: "¿Qué voy a aprender de yoga?",
        items: [
          "Historia y filosofía; biomecánica aplicada al yoga",
          "Asanas: alineación, beneficios y secuencias",
          "Pranas, koshas, nadis y chakras",
          "Pranayamas, mudras, mantras, bandhas y kriyas",
          "Introducción a la medicina ayurveda; doshas y gunas",
          "Yoga de la alimentación: 2 talleres de cocina ayurveda creativa",
          "Técnicas de meditación, yoga nidra y mándalas",
          "Integración emocional y el yoga como fuente de ingresos y de servicio",
        ],
      },
      {
        title: "Pilates: «El arte del control»",
        question: "¿Qué voy a aprender de pilates?",
        items: [
          "Los seis principios básicos: centro de energía, concentración, control, precisión, respiración y fluidez del movimiento",
          "Los seis conceptos fundamentales: posición pilates, línea central, articulación vértebra por vértebra y curva C",
          "Respiración Pilates y ejercicios pre-pilates",
          "Ejercicios de colchoneta: sistema básico, intermedio y avanzado",
          "Series con bandas elásticas, balón y pesas",
          "Entrenar en condiciones especiales (patologías específicas)",
          "Conexión yoga-pilates y diseño de clase",
          "Metodología de la enseñanza y ética profesional",
        ],
      },
      {
        title: "Cómo se reparten las horas",
        question: "¿Cómo se reparten las 250 horas?",
        items: [
          "Online (práctica y teoría): 140 horas",
          "Estudio de investigación: 56 horas (lecturas, documentales en la plataforma Gaia y trabajo final)",
          "Karma yoga o labor social: 12 horas, en grupo",
          "Sadhana (práctica personal): 30 horas, que puedes tomar gratis en las clases de la escuela",
        ],
      },
    ],
    teachers: [TEAM.lila, TEAM.daniel, TEAM.maria],
    schedule: HORARIO_BASE,
    includes: [
      "Memorias de la formación en PDF, «Yoga in Action» de Geeta S. Iyengar, el Bhagavad Gita y un libro de Pilates en PDF",
      "Clases en vivo por plataforma, donde puedes participar, preguntar y debatir",
      "Acompañamiento personalizado",
      "Acreditación internacional por Yoga Alliance (USA)",
    ],
    requirements: [
      "Asistir a las 140 horas de formación práctica y teórica.",
      "Cumplir las 30 horas de práctica personal (puedes tomarlas gratis en las clases online de la escuela).",
      "Realizar la tesina y las demás tareas (lecturas y documentales).",
    ],
    faq: [
      { q: "¿Qué obtengo al terminar?", a: "Una doble titulación en yoga y pilates, con aval internacional. Si cumples con todo, después de graduarte puedes seguir asistiendo a las clases activas de la escuela durante todo el año sin costo." },
      FAQ_PAGO,
      FAQ_DESPUES,
      FAQ_LESION,
      FAQ_ASESORA,
    ],
    magazine: true,
    testimonials: [RESENAS.adriana, RESENAS.camila],
  },

  "certificacion-de-yoga-kids": {
    kicker: "Certificación internacional · 200 horas",
    headline: "Formación en Yoga Kids y metodologías alternativas para la infancia",
    subheadline: "Sembrando bienestar en las nuevas generaciones: herramientas prácticas de calma, enfoque y gestión emocional, con doble titulación en Yoga Prenatal.",
    proof: ["Doble titulación: Yoga Kids y Yoga Prenatal", "Respaldo médico de una médica cirujana experta en ayurveda", "Incluye kit para vivir la experiencia en casa"],
    heroImage: { src: "/revistas/certificacion-de-yoga-kids/01.webp", alt: "Portada de la certificación: mamá con su bebé y niños practicando yoga", position: "50% 30%" },
    seo: {
      title: "Certificación en Yoga Kids y Yoga Prenatal (200 horas) | Fullness Camp",
      description: "Formación de Yoga Kids y metodologías alternativas para la infancia, con doble titulación en Yoga Prenatal. 200 horas, online, con respaldo médico.",
    },
    facts: [
      { icon: "clock", label: "Duración", value: "200 horas", detail: "Certificación internacional" },
      { icon: "award", label: "Titulación", value: "Doble titulación", detail: "Yoga Kids y Yoga Prenatal" },
      { icon: "calendar", label: "Jornadas", value: "Mañana o noche", detail: "Lunes, miércoles y viernes" },
      { icon: "gift", label: "Incluye", value: "Kit en casa", detail: "Para vivir la experiencia" },
    ],
    audience: [
      "Trabajas con población infantil: psicología, pedagogía, pediatría, preescolar o cuidado de niños.",
      "Tienes hijos o quieres compartir tu experiencia de vida con otros seres desde su gestación, infancia y preadolescencia.",
      "Ya practicas yoga y quieres enriquecer tu práctica y tu oferta profesional.",
      "Buscas una fuente de ingresos que provenga de lo que amas hacer.",
    ],
    prerequisites: "Cualquiera sea tu situación o tu experiencia, igual si no la tienes, te acompañamos en el camino.",
    outcomes: [
      { title: "Estrategias para la gestión emocional", text: "Metodologías para ayudar a los niños a manejar el estrés, mejorar la atención y fortalecer su autoestima en entornos escolares o terapéuticos." },
      { title: "Desarrollo motriz y concentración", text: "Técnicas alternativas adaptadas a cada etapa del crecimiento, con gimnasia psicofísica y estimulación muscular." },
      { title: "Visión completa del bienestar", text: "Desde el vientre materno hasta la niñez, con doble titulación en Yoga Prenatal." },
      { title: "Ampliar tu campo laboral", text: "Una certificación internacional que suma a tu perfil como docente, terapeuta o cuidadora." },
    ],
    curriculum: [
      {
        title: "Temario",
        question: "¿Qué temas voy a aprender?",
        items: [
          "Yoga gestacional y yoga post natal",
          "Ayurveda gestacional y ayurveda del puerperio",
          "Trabajo de lactancia y parto",
          "Yoga mamá y bebé; yoga porteo",
          "Yoga Kids",
          "El yoga para niños en la virtualidad",
          "Yoga para la familia",
        ],
      },
    ],
    teachers: [TEAM.lila, TEAM.cely, {
      name: "Nairo Andrés Díaz Sanabria (Andy EVS)",
      role: "Pilates y yoga terapéutico",
      bio: "Licenciado en Educación Física, Recreación y Deporte de la Universidad de Cundinamarca. Especialista en Pilates y Yoga Terapéutico, con más de 20 años de experiencia en sesiones grupales y 8 años como monitor profesional del programa nacional de hábitos y estilos de vida saludable del Ministerio del Deporte.",
    }],
    schedule: [{ title: "Dos jornadas entre semana (eliges una)", lines: ["Mañanas: lunes, miércoles y viernes, 9:00 a. m. a 12:00 m.", "Noches: lunes, miércoles y viernes, 6:00 a 9:00 p. m."] }],
    includes: [
      "Kit para que vivas la experiencia en casa",
      "Diploma internacional de la doble titulación (Yoga Kids y Yoga Prenatal)",
      "Acceso a todas las prácticas de yoga de la escuela, en los distintos horarios, sin costo adicional durante la formación",
    ],
    requirements: [],
    faq: [
      { q: "¿Es solo para profesoras de yoga?", a: "No. Es ideal para profesores de preescolar y primaria, psicólogos, pediatras, fisioterapeutas y cuidadores, así como para quien quiera acercarse al yoga con niños." },
      { q: "¿Qué recibo al terminar?", a: "Un diploma internacional con doble titulación: Yoga Kids y Yoga Prenatal." },
      FAQ_PAGO,
      FAQ_DESPUES,
      FAQ_ASESORA,
    ],
    magazine: true,
  },

  "yoga-prenatal-nacimiento-consciente": {
    kicker: "Taller para parejas · 9 sesiones",
    headline: "Abriendo la puerta a la maternidad: vive un embarazo y un nacimiento conscientes",
    subheadline: "Un espacio para transformar el miedo en confianza, conectar con tu bebé desde la gestación y prepararte, en pareja, para un parto respetado.",
    proof: ["Dirigido por una médica cirujana y la directora de la escuela", "Se vive en pareja: mamá y papá (o acompañante)", "Incluye los contenidos del curso psicoprofiláctico"],
    heroImage: { src: "/images/2018_12_prenatal.png.webp", alt: "Mujer embarazada practicando yoga con apoyo en un balón", position: "50% 40%" },
    seo: {
      title: "Taller de yoga prenatal para parejas: embarazo y nacimiento consciente | Fullness Camp",
      description: "Taller de 9 sesiones para parejas: yoga prenatal, parto humanizado, lactancia y crianza respetuosa, con respaldo médico. Online y semipresencial.",
    },
    facts: [
      { icon: "calendar", label: "Sesiones", value: "9 módulos", detail: "Con yoga, meditación y respiración" },
      { icon: "clock", label: "Horario", value: "Sábados", detail: "8:00 a. m. a 12:00 m." },
      { icon: "laptop", label: "Modalidad", value: "Online y semipresencial" },
      { icon: "users", label: "Para quién", value: "Parejas", detail: "Mamá y papá o acompañante" },
    ],
    audience: [
      "Estás embarazada o planeando tu embarazo y quieres vivirlo de forma activa, consciente y amorosa.",
      "Quieres que tu pareja se sienta parte del proceso, no un espectador.",
      "Buscas herramientas naturales y creativas para el trabajo de parto, el parto y el puerperio.",
    ],
    prerequisites: "No necesitas experiencia previa en yoga. Cada sesión incluye práctica de yoga, meditación y respiración.",
    outcomes: [
      { title: "Un parto con información y confianza", text: "Conoces y aplicas técnicas sedativas para un parto natural, y herramientas para empoderar a la madre y sus derechos para vivir un parto respetado y humanizado." },
      { title: "Conexión con tu bebé", text: "Prácticas de respiración, movimiento y meditación para conectar con el bebé desde la gestación hasta el puerperio." },
      { title: "Cuidados del recién nacido", text: "Lactancia y almacenamiento, apego y porteo, masaje infantil (Shantala) y cuidados del recién nacido y primeros auxilios pediátricos." },
      { title: "Familia fortalecida", text: "Crianza respetuosa, acuerdos de crianza y herramientas para cultivar el amor propio y el amor de pareja." },
    ],
    curriculum: [
      {
        title: "Los 9 módulos",
        question: "¿Qué veremos en las 9 sesiones?",
        items: [
          "1. Maternidad consciente: sanación de mis ancestros y linaje femenino",
          "2. Canto carnático maternal: parir cantando",
          "3. Parto humanizado: técnicas sedativas, sabiduría ancestral y cesárea sagrada",
          "4. Preparando tu espacio sagrado de alumbramiento",
          "5. Tiempo de cosecha: una nueva familia, el altar del bebé y la sacralidad de la cuarentena",
          "6. Soy fuente de vida: masaje de pareja, lactancia, apego y porteo",
          "7. Shantala y cuidados del bebé; cuidados posparto y el poder de las plantas",
          "8. Elevando el amor: amor propio, amor de pareja y crianza respetuosa",
          "9. Ceremonia de temazcal: sanando al niño interior y preparando el regreso a esta tierra",
        ],
      },
    ],
    teachers: [TEAM.lila, TEAM.cely],
    schedule: [{ title: "Sesiones", lines: ["Sábados, de 8:00 a. m. a 12:00 m.", "Online / semipresencial"] }],
    includes: ["Materiales del taller", "Cada sesión incluye práctica de yoga, meditación y respiración", "Contenidos del curso convencional psicoprofiláctico"],
    requirements: [],
    faq: [
      { q: "¿El taller es solo para mujeres?", a: "No. Está diseñado para parejas: mamá y papá (o acompañante). La presencia activa de la pareja es parte fundamental del proceso." },
      { q: "¿Reemplaza el curso psicoprofiláctico?", a: "El taller abarca los contenidos del curso convencional psicoprofiláctico, y además suma yoga, meditación y respiración en cada sesión." },
      FAQ_PAGO,
      FAQ_DESPUES,
      FAQ_ASESORA,
    ],
    magazine: true,
  },

  "maestria-yogaayurveda-mujer": {
    kicker: "Maestría internacional · 500 horas",
    headline: "Maestría en Hatha Vinyasa Yoga y Ayurveda para la mujer",
    subheadline: "Despierta tu sabiduría ancestral y tu longevidad natural: ciencia del ayurveda y práctica del Hatha Vinyasa para armonizar tus necesidades físicas, energéticas y hormonales en cada etapa de la vida.",
    proof: ["Doble titulación internacional", "Enfoque único en salud hormonal", "Respaldo médico en ayurveda"],
    heroImage: { src: "/images/2026_04_IMG_2898-scaled.jpg", alt: "Mujer practicando yoga en un salón luminoso con arcos", position: "50% 35%" },
    seo: {
      title: "Maestría en Hatha Vinyasa Yoga y Ayurveda para la mujer | Fullness Camp",
      description: "Maestría internacional de yoga y ayurveda para la mujer: salud hormonal, Rasayana (rejuvenecimiento), ciclo lunar y cosmética natural. Próxima cohorte por confirmar.",
    },
    facts: [
      { icon: "clock", label: "Duración", value: "500 horas", detail: "Por confirmar" },
      { icon: "award", label: "Titulación", value: "Doble titulación", detail: "Con aval internacional" },
      { icon: "laptop", label: "Modalidad", value: "Online y semipresencial" },
      { icon: "calendar", label: "Próxima cohorte", value: "Por confirmar", detail: "Déjanos tus datos y te avisamos" },
    ],
    audience: [
      "Deseas profundamente enriquecer y compartir tu experiencia de vida para que sirva de luz a otras mujeres.",
      "Buscas una comprensión profunda de tu naturaleza cíclica.",
      "Quieres una fuente de ingresos que provenga de lo que amas hacer.",
      "Ya practicas yoga y deseas enriquecer tu práctica, o quieres encontrar una nueva manera de bienestar.",
    ],
    prerequisites: "Cualquiera sea tu situación o tu experiencia, o si no la tienes, te acompañamos con preguntas, respuestas y autoconocimiento.",
    outcomes: [
      { title: "Rasayana y longevidad", text: "Protocolos de regeneración celular y nutrición ayurvédica con herramientas 100 % naturales para la salud a largo plazo." },
      { title: "Salud hormonal", text: "Técnicas de ayurveda, herbolaria y aromaterapia para la salud hormonal, el ciclo menstrual y el climaterio." },
      { title: "Poder personal y amor propio", text: "Linaje femenino, ciclo lunar y técnicas de empoderamiento para reconectar con tu sabiduría interna." },
      { title: "Hatha Vinyasa adaptado", text: "Asana y meditación diseñadas para respetar y potenciar el ritmo cíclico femenino, evitando el agotamiento." },
    ],
    curriculum: [
      {
        title: "Módulos",
        question: "¿Qué módulos tiene la maestría?",
        items: [
          "Módulo 1: Cuerpo físico (asanas y yoga de la alimentación), cuerpo energético (chakras, pranayamas y mudras) y plano mental (meditación e integración emocional)",
          "Módulo 2: Yoga gestacional y post natal, ayurveda durante la gestación y posturas de yoga",
          "Módulo 3: Rasayana (rejuvenecimiento): terapias de rejuvenecimiento, yoga facial, salud hormonal y herbolaria para la salud femenina",
          "Módulo 4: Cosmética natural: cosmética slow, rutinas de belleza y taller de productos naturales",
          "Módulo 5: Entendiendo nuestro linaje femenino: autocontención (Swastya), integración emocional y técnicas de empoderamiento",
          "Módulo 6: Ciclo lunar: arquetipos, yoga para cada fase del ciclo y ayurveda para la salud hormonal; climaterio",
          "Módulo 7: Tantra yoga y huevos yoni",
        ],
      },
    ],
    teachers: [TEAM.lila, TEAM.cely],
    schedule: [{ title: "Próxima cohorte", lines: ["Por confirmar. Déjanos tus datos y te avisamos apenas abramos inscripciones."] }],
    includes: ["Memorias de la formación en PDF y «Yoga in Action» de Geeta S. Iyengar", "Kit de yoga", "Kit de ingredientes para el taller de cosmética natural", "Doble titulación internacional"],
    requirements: [],
    faq: [
      { q: "¿Cuándo empieza la próxima cohorte?", a: "Todavía estamos confirmando fechas y horarios. Si dejas tus datos, te avisamos primero cuando abramos inscripciones." },
      { q: "¿Qué obtengo al terminar?", a: "Una doble titulación con aval internacional, que te permite ejercer profesionalmente como experta en bienestar femenino." },
      FAQ_ASESORA,
    ],
    magazine: true,
    testimonials: [RESENAS.adriana],
  },

  "inmersion-y-certificacion-de-yoga-en-colombia": {
    kicker: "Inmersión y certificación · 200 horas",
    headline: "Inmersión y certificación internacional en Hatha Vinyasa Yoga",
    subheadline: "Una experiencia en conexión con la naturaleza, mientras adquieres herramientas para manifestar una vida llena de bienestar y plenitud. Programa multinivel.",
    proof: ["Diploma internacional", "Programa multinivel: no se requiere experiencia", "Docente: Lila Govardhan, directora de la escuela"],
    heroImage: { src: "/images/2026_03_IMG_7580.jpg", alt: "Grupo practicando yoga en un domo de madera rodeado de naturaleza", position: "50% 55%" },
    seo: {
      title: "Inmersión y certificación en Hatha Vinyasa Yoga (200 horas) | Fullness Camp",
      description: "Inmersión de yoga en la naturaleza con certificación internacional de 200 horas, multinivel. Próxima fecha por confirmar.",
    },
    facts: [
      { icon: "clock", label: "Duración", value: "200 horas", detail: "Certificación internacional" },
      { icon: "mountain", label: "Inmersión", value: "100 horas", detail: "Presenciales" },
      { icon: "users", label: "Nivel", value: "Multinivel", detail: "Sin experiencia previa" },
      { icon: "calendar", label: "Próxima fecha", value: "Por confirmar", detail: "Déjanos tus datos y te avisamos" },
    ],
    audience: [
      "Quieres comenzar un camino de autoconocimiento y herramientas valiosas para tu bienestar.",
      "Prefieres una experiencia intensiva en la naturaleza combinada con clases online.",
      "Deseas compartir el yoga como fuente de ingresos y de servicio.",
    ],
    prerequisites: "No se requiere experiencia: solo las ganas de aprender.",
    outcomes: [
      { title: "Práctica con alineación segura", text: "Aprendes las posturas con la alineación correcta y sus variaciones según tu condición física." },
      { title: "Conocer tu biotipo (dosha)", text: "Descubres qué alimentos y qué tipo de yoga te benefician más, y tus horarios de práctica diaria (sadhana)." },
      { title: "Alimentación ancestral", text: "Dos talleres de cocina con recetas prácticas y nutritivas para ti y tu familia." },
      { title: "Mente y emociones", text: "Conoces el mecanismo de tu mente y cómo abrazar e integrar tus emociones." },
    ],
    curriculum: [{ title: "Qué incluye la formación", question: "¿Qué voy a aprender en la inmersión?", items: ["Clases teórico-prácticas: el porqué y el para qué de cada asana, pranayama, mudra y mantra", "Diseño de clases con objetivos claros", "Plataforma de encuentros en vivo previos y posteriores a la inmersión", "Suscripción a Gaia (6 meses sin costo adicional)"] }],
    teachers: [TEAM.lila],
    schedule: [{ title: "Próxima inmersión", lines: ["Por confirmar. Déjanos tus datos y te avisamos."] }],
    includes: ["Memorias de la formación en PDF y «Yoga in Action» de Geeta S. Iyengar", "El Bhagavad Gita en PDF", "Kit de yoga"],
    requirements: [
      "Asistir a las 100 horas de formación práctica y teórica de la inmersión.",
      "Cumplir las 36 horas de práctica académica con las clases online de la certificación.",
      "Asistir a la sesión online previa a la inmersión.",
      "Realizar la tesina y las demás tareas.",
    ],
    faq: [
      { q: "¿Cuándo es la próxima inmersión?", a: "Estamos confirmando fechas y lugar. Si dejas tus datos, te avisamos primero." },
      FAQ_ASESORA,
    ],
    magazine: true,
  },
};

export function getLanding(slug: string): Landing | undefined {
  return LANDINGS[slug];
}
