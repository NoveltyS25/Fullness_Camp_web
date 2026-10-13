import Link from "next/link";
import { currentMonth, monthKey, monthTitle, monthWeeks, shiftMonth, todayKey } from "@/lib/campus/calendar";
import { dayKey, formatDay, formatTime } from "@/lib/campus/time";
import type { SessionRow } from "@/server/campus";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Calendario mensual de las clases. Cada clase abre la pantalla para cambiar su horario. */
export function MonthCalendar({
  year,
  month,
  sessions,
  basePath,
  query = "",
  editable = true,
  hideList = false,
}: {
  year: number;
  month: number;
  sessions: SessionRow[];
  basePath: string;
  /** Parámetros extra que se conservan al cambiar de mes, por ejemplo "cert=mi-certificacion". */
  query?: string;
  /** Docentes: cada clase abre la pantalla para cambiar su horario. Estudiantes: solo se ven. */
  editable?: boolean;
  /** Oculta la lista por día de los celulares (cuando la página ya muestra el detalle debajo). */
  hideList?: boolean;
}) {
  const hrefFor = (y: number, m: number) => `${basePath}?${query ? `${query}&` : ""}mes=${monthKey(y, m)}`;
  const todayHref = query ? `${basePath}?${query}` : basePath;
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const now = currentMonth();
  const today = todayKey();
  const byDay = new Map<string, SessionRow[]>();
  for (const s of sessions) byDay.set(dayKey(s.starts_at), [...(byDay.get(dayKey(s.starts_at)) ?? []), s]);
  const weeks = monthWeeks(year, month);
  const link = "inline-flex min-h-12 items-center rounded-full px-4 font-medium text-clay-dark underline hover:bg-clay-soft";

  const chip = (s: SessionRow) => {
    const inner = (
      <>
        <span className="font-bold">{formatTime(s.starts_at)}</span> {s.class_title}
      </>
    );
    const tone = s.status === "cancelled" ? "bg-red-50 text-red-900 line-through" : "bg-clay-soft text-clay-dark";
    return editable ? (
      <Link key={s.id} href={`/campus/profesor/sesion/${s.id}`} className={`block rounded-lg px-2 py-1 text-sm no-underline ${tone} ${s.status === "cancelled" ? "" : "hover:bg-clay hover:text-white"}`}>
        {inner}
      </Link>
    ) : (
      <span key={s.id} className={`block rounded-lg px-2 py-1 text-sm ${tone}`}>{inner}</span>
    );
  };

  return (
    <section aria-labelledby="mes">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="mes" className="text-2xl font-bold">{monthTitle(year, month)}</h2>
        <div className="flex flex-wrap items-center">
          <Link href={hrefFor(prev.year, prev.month)} className={link}>← Anterior</Link>
          {(year !== now.year || month !== now.month) && <Link href={todayHref} className={link}>Este mes</Link>}
          <Link href={hrefFor(next.year, next.month)} className={link}>Siguiente →</Link>
        </div>
      </div>

      {/* Pantallas grandes: cuadrícula del mes */}
      <div className="hidden overflow-hidden rounded-3xl border border-clay-soft bg-white sm:block">
        <div className="grid grid-cols-7 border-b border-clay-soft bg-sand text-center font-medium">
          {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        {weeks.map((w, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-clay-soft last:border-b-0">
            {w.map((c) => (
              <div key={c.key} className={`min-h-28 border-r border-clay-soft p-1.5 last:border-r-0 ${c.inMonth ? "" : "bg-sand/60 text-muted"}`}>
                <p className={`mb-1 text-sm font-medium ${c.key === today ? "inline-grid h-7 w-7 place-items-center rounded-full bg-clay-dark text-white" : ""}`}>{c.day}</p>
                <div className="space-y-1">{c.inMonth && (byDay.get(c.key) ?? []).map(chip)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Celulares: lista por día */}
      <div className={`space-y-4 sm:hidden ${hideList ? "hidden" : ""}`}>
        {[...byDay.entries()].length === 0 && <p className="rounded-3xl border border-clay-soft bg-white p-6 text-lg">No hay clases este mes.</p>}
        {[...byDay.entries()].map(([key, list]) => (
          <div key={key}>
            <h3 className="mb-2 font-bold">{formatDay(list[0].starts_at)}</h3>
            <div className="space-y-2">{list.map(chip)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
