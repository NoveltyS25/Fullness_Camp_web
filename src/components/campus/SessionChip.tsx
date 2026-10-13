"use client";

import { useRef } from "react";
import { formatDay, formatRange, formatTime } from "@/lib/campus/time";

export interface ChipSession {
  id: string;
  title: string;
  class_title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  online_url: string | null;
  status: "scheduled" | "cancelled";
  teacher_name: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

/** Una clase dentro del calendario de la estudiante: al tocarla se abre una ventana con toda su información. */
export function SessionChip({ s, modalityLabel, certTitle }: { s: ChipSession; modalityLabel: string; certTitle?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelled = s.status === "cancelled";
  const tone = cancelled ? "bg-red-50 text-red-900 line-through" : "bg-clay-soft text-clay-dark hover:bg-clay hover:text-white";

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={`block w-full rounded-lg px-2 py-1 text-left text-sm ${tone}`}>
        <span className="font-bold">{formatTime(s.starts_at)}</span> {s.class_title}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`d-${s.id}`}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close(); // clic en el fondo oscuro
        }}
        className="m-auto w-[min(92vw,34rem)] rounded-3xl border border-clay-soft bg-white p-0 text-ink shadow-2xl backdrop:bg-black/50"
      >
        <div className="space-y-4 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              {certTitle && <p className="mb-1 text-sm font-medium uppercase tracking-wide text-clay-dark">{certTitle}</p>}
              <h3 id={`d-${s.id}`} className={`text-2xl font-bold ${cancelled ? "line-through" : ""}`}>{s.class_title}</h3>
              {s.title !== s.class_title && <p className="text-muted">{s.title}</p>}
            </div>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Cerrar" className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl hover:bg-clay-soft">×</button>
          </div>

          {cancelled && <p className="rounded-xl bg-red-50 p-3 font-medium text-red-900">Esta clase fue cancelada.</p>}

          <dl className="space-y-3 text-lg">
            <div>
              <dt className="text-sm font-medium text-muted">Cuándo</dt>
              <dd className="font-medium">{formatDay(s.starts_at)}, {formatRange(s.starts_at, s.ends_at)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted">Docente</dt>
              <dd>{s.teacher_name ?? "Por asignar"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted">Modalidad</dt>
              <dd>{modalityLabel}</dd>
            </div>
            {s.location && (
              <div>
                <dt className="text-sm font-medium text-muted">Lugar</dt>
                <dd>{s.location}</dd>
              </div>
            )}
            {s.description && (
              <div>
                <dt className="text-sm font-medium text-muted">Sobre la clase</dt>
                <dd>{s.description}</dd>
              </div>
            )}
            {(s.contact_email || s.contact_phone) && (
              <div>
                <dt className="text-sm font-medium text-muted">Contacto de la docente</dt>
                <dd>
                  {s.contact_email && <a href={`mailto:${s.contact_email}`} className="block break-all font-medium text-clay-dark underline">{s.contact_email}</a>}
                  {s.contact_phone && <a href={`https://wa.me/${s.contact_phone}`} target="_blank" rel="noopener noreferrer" className="block font-medium text-clay-dark underline">WhatsApp {s.contact_phone}</a>}
                </dd>
              </div>
            )}
          </dl>

          {s.online_url && !cancelled && (
            <a href={s.online_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">Entrar a la clase en línea</a>
          )}
        </div>
      </dialog>
    </>
  );
}
