import { dayKey } from "./time.ts";

/** "2026-10" válido o null. */
export function parseMonth(value: string | undefined): { year: number; month: number } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? "");
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

export const monthKey = (year: number, month: number): string => `${year}-${String(month).padStart(2, "0")}`;

/** Mes de hoy en hora de Colombia. */
export function currentMonth(now: Date = new Date()): { year: number; month: number } {
  const [y, m] = dayKey(now.toISOString()).split("-").map(Number);
  return { year: y, month: m };
}

export function todayKey(now: Date = new Date()): string {
  return dayKey(now.toISOString());
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** Desde el primer instante del mes hasta el primero del siguiente, en hora de Colombia (UTC-5). */
export function monthRangeIso(year: number, month: number): { from: string; to: string } {
  return {
    from: new Date(Date.UTC(year, month - 1, 1, 5)).toISOString(),
    to: new Date(Date.UTC(year, month, 1, 5)).toISOString(),
  };
}

export interface DayCell {
  key: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
}

/** Semanas (lunes a domingo) que cubren el mes. */
export function monthWeeks(year: number, month: number): DayCell[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const start = new Date(Date.UTC(year, month - 1, 1 - offset));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const out: DayCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start.getTime() + (w * 7 + d) * 86_400_000);
      row.push({ key: cell.toISOString().slice(0, 10), day: cell.getUTCDate(), inMonth: cell.getUTCMonth() === month - 1 });
    }
    out.push(row);
  }
  return out;
}

const monthName = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
export function monthTitle(year: number, month: number): string {
  const s = monthName.format(new Date(Date.UTC(year, month - 1, 1)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
