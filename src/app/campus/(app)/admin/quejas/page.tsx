import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, inputClass } from "@/components/campus/ActionForm";
import { KINDS, STATUSES } from "@/lib/complaint-kinds";
import { listComplaints } from "@/server/complaints";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import { updateComplaintAction } from "./actions";

export const metadata = { title: "Quejas y denuncias", robots: { index: false, follow: false } };

const fmt = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" });
const day = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "medium" });

const isPastDue = (iso: string) => new Date(iso).getTime() < Date.now();

export default async function Quejas() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/campus");
  const items = await listComplaints(getDb());

  return (
    <>
      <p className="mb-4"><Link href="/campus/admin" className="underline">← Administración</Link></p>
      <h1 className="mb-3 text-3xl font-bold sm:text-4xl">Quejas y denuncias</h1>
      <p className="mb-8 text-lg text-muted">
        Información confidencial: no la compartas fuera del órgano de revisión. La política da 30 días hábiles para aceptar o desestimar cada queja y, si se desestima, hay que dar las razones.
      </p>

      {items.length === 0 ? (
        <p className="rounded-3xl border border-clay-soft bg-white p-8 text-center text-xl">No hay quejas ni denuncias.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((c) => {
            const open = c.status === "recibida" || c.status === "en_revision";
            const late = open && isPastDue(c.due_at);
            return (
              <li key={c.id}>
                <details open={c.status === "recibida"} className="rounded-3xl border border-clay-soft bg-white p-5">
                  <summary className="cursor-pointer text-lg">
                    <span className="font-bold text-clay-dark">{c.code}</span> · {KINDS[c.kind]}
                    <span className={`ml-3 rounded-full px-3 py-1 text-sm ${open ? "bg-clay-dark text-white" : "bg-clay-soft"}`}>{STATUSES[c.status]}</span>
                    {late && <span className="ml-2 rounded-full bg-red-800 px-3 py-1 text-sm text-white">Plazo vencido</span>}
                  </summary>
                  <dl className="mt-4 space-y-2 text-lg">
                    <div><dt className="inline font-medium">Recibida: </dt><dd className="inline">{fmt.format(new Date(c.created_at))}</dd></div>
                    <div><dt className="inline font-medium">Responder antes del: </dt><dd className="inline">{day.format(new Date(c.due_at))}</dd></div>
                    <div><dt className="inline font-medium">Presenta: </dt><dd className="inline">{c.anonymous ? "Anónima (no dejó datos de contacto)" : `${c.full_name} · ${c.email}${c.phone ? ` · ${c.phone}` : ""}`}</dd></div>
                    <div><dt className="inline font-medium">Sobre: </dt><dd className="inline">{c.accused}</dd></div>
                    {(c.event_date || c.event_place) && <div><dt className="inline font-medium">Cuándo y dónde: </dt><dd className="inline">{[c.event_date, c.event_place].filter(Boolean).join(" · ")}</dd></div>}
                    <div><dt className="font-medium">Descripción</dt><dd className="whitespace-pre-wrap rounded-xl bg-sand p-4">{c.description}</dd></div>
                    {c.witnesses && <div><dt className="font-medium">Testigos o evidencias</dt><dd className="whitespace-pre-wrap rounded-xl bg-sand p-4">{c.witnesses}</dd></div>}
                  </dl>

                  <div className="mt-6 border-t border-clay-soft pt-6">
                    <ActionForm action={updateComplaintAction} submitLabel="Guardar estado">
                      <input type="hidden" name="id" value={c.id} />
                      <div>
                        <label htmlFor={`st-${c.id}`} className="mb-2 block text-lg font-medium">Estado</label>
                        <select id={`st-${c.id}`} name="status" defaultValue={c.status} className={inputClass}>
                          {Object.entries(STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`rs-${c.id}`} className="mb-2 block text-lg font-medium">Decisión o motivo (obligatorio al desestimar o cerrar)</label>
                        <textarea id={`rs-${c.id}`} name="resolution" rows={4} defaultValue={c.resolution ?? ""} className="w-full rounded-xl border-2 border-clay-soft bg-white p-4 text-lg" />
                      </div>
                    </ActionForm>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
