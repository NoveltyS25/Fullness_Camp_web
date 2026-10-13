/**
 * Avance de una estudiante en cada asignatura (clase) de su certificación.
 *  - pendiente: aún no empieza el ciclo de la asignatura (automático).
 *  - en_curso: ya empezó su primera clase (automático), o la docente lo marcó.
 *  - aprobado / no_aprobado: solo lo marca la docente de la asignatura.
 */
export type ProgressStatus = "pendiente" | "en_curso" | "aprobado" | "no_aprobado";

/** Lo que la docente puede elegir; «automatico» borra su decisión y vuelve a pendiente/en curso según las fechas. */
export const TEACHER_CHOICES = ["automatico", "en_curso", "aprobado", "no_aprobado"] as const;
export type TeacherChoice = (typeof TEACHER_CHOICES)[number];

export const PROGRESS_LABEL: Record<ProgressStatus, string> = {
  pendiente: "Pendiente por tomar",
  en_curso: "En curso",
  aprobado: "Aprobada",
  no_aprobado: "No aprobada",
};

export const CHOICE_LABEL: Record<TeacherChoice, string> = {
  automatico: "Automático (según las fechas)",
  en_curso: "En curso",
  aprobado: "Aprobada",
  no_aprobado: "No aprobada",
};

/** Colores de cada estado (clases de Tailwind). */
export const PROGRESS_TONE: Record<ProgressStatus, string> = {
  pendiente: "border border-clay-dark text-clay-dark bg-white",
  en_curso: "bg-clay-soft text-clay-dark",
  aprobado: "bg-emerald-100 text-emerald-900",
  no_aprobado: "bg-red-100 text-red-900",
};

/** Estado que se muestra: el que decidió la docente, o el automático según la fecha de inicio del ciclo. */
export function effectiveStatus(explicit: ProgressStatus | null, cycleStart: string | null, now: Date = new Date()): ProgressStatus {
  if (explicit) return explicit;
  return cycleStart && new Date(cycleStart) <= now ? "en_curso" : "pendiente";
}
