import Link from "next/link";
import { redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { getDb } from "@/server/db";
import { listLeads } from "@/server/leads";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Personas interesadas" };

const when = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" });

function origin(attribution: string | null): string {
  if (!attribution) return "Directo / sin campaña";
  try {
    const a = JSON.parse(attribution) as Record<string, string>;
    const parts = [a.utm_source, a.utm_medium, a.utm_campaign].filter(Boolean);
    return parts.length ? parts.join(" · ") : a.referrer ? `Desde ${a.referrer}` : "Directo / sin campaña";
  } catch {
    return "—";
  }
}

export default async function Interesadas() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/campus");
  const leads = await listLeads(getDb());

  return (
    <>
      <p className="mb-4"><Link href="/campus/admin" className="underline">← Administración</Link></p>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">Personas interesadas</h1>
        <a href="/campus/admin/interesadas/exportar" className="btn btn-secondary">Descargar CSV</a>
      </div>
      <p className="mb-6 text-lg text-muted">Quienes dejaron sus datos en la página de un programa, y de qué campaña llegaron.</p>

      {leads.length === 0 ? (
        <p className="rounded-3xl border border-clay-soft bg-white p-8 text-center text-xl">Todavía no hay personas interesadas.</p>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <li key={l.id} className="rounded-2xl border border-clay-soft bg-white p-5">
              <p className="text-sm text-muted">{when.format(new Date(l.created_at))} · {l.interest === "waitlist" ? "Quiere que le avisen" : "Pidió información"}</p>
              <p className="text-xl font-bold">{l.full_name}</p>
              <p>{l.email}{l.whatsapp ? ` · WhatsApp ${l.whatsapp}` : ""}</p>
              <p className="text-muted">Programa: {getProgram(l.program_slug)?.title ?? l.program_slug}</p>
              <p className="text-sm font-medium text-clay-dark">Origen: {origin(l.attribution)}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
