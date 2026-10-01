/** Colombia no tiene horario de verano: siempre UTC-5. */
const TZ = "America/Bogota";

const dayFmt = new Intl.DateTimeFormat("es-CO", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("es-CO", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }); // YYYY-MM-DD

export function formatDay(iso: string): string {
  const s = dayFmt.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatTime(iso: string): string {
  // Intl usa un espacio especial antes de a. m. / p. m.; se normaliza a un espacio común.
  return timeFmt.format(new Date(iso)).replace(/\s/g, " ");
}

export function formatRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

/** Clave de día en hora de Colombia, para agrupar sesiones. */
export function dayKey(iso: string): string {
  return keyFmt.format(new Date(iso));
}

/** Valor para <input type="datetime-local"> en hora de Colombia, ej. "2026-10-05T18:00". */
export function toLocalInput(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 5 * 3600_000);
  return d.toISOString().slice(0, 16);
}

/** Convierte lo que escribió la profesora (hora de Colombia) a un instante UTC en ISO. */
export function fromLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
