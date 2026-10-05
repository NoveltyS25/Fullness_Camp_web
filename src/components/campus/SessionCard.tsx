import Link from "next/link";
import { formatRange } from "@/lib/campus/time";
import type { SessionRow } from "@/server/campus";

export function SessionCard({ s, editHref }: { s: SessionRow; editHref?: string }) {
  const cancelled = s.status === "cancelled";
  return (
    <li className={`rounded-3xl border p-5 ${cancelled ? "border-red-200 bg-red-50" : "border-clay-soft bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className={`text-xl font-bold ${cancelled ? "line-through" : ""}`}>{s.title}</h3>
        {cancelled && <span className="rounded-full bg-red-900 px-3 py-1 text-sm font-medium text-white">Cancelada</span>}
      </div>
      <p className="mt-1 text-lg font-medium">{formatRange(s.starts_at, s.ends_at)}</p>
      <p className="text-muted">
        {s.cohort_name} · {s.sede}
        {s.location ? ` · ${s.location}` : ""}
      </p>
      {s.online_url && !cancelled && (
        <p className="mt-2">
          <a href={s.online_url} target="_blank" rel="noopener noreferrer" className="font-medium text-clay-dark underline">
            Entrar a la clase en línea
          </a>
        </p>
      )}
      {editHref && <Link href={editHref} className="btn btn-secondary mt-4">Cambiar horario</Link>}
    </li>
  );
}
