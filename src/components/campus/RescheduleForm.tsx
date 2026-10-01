"use client";

import { useActionState } from "react";
import { rescheduleSession, type FormState } from "@/app/campus/actions";

const input = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";

interface Props {
  sessionId: string;
  title: string;
  startsAt: string; // "YYYY-MM-DDTHH:mm" en hora de Colombia
  endsAt: string;
  location: string;
  onlineUrl: string;
  cancelled: boolean;
  studentCount: number;
}

export function RescheduleForm(p: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(rescheduleSession, {});

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="session_id" value={p.sessionId} />

      <p className="rounded-2xl bg-clay-soft p-4 text-lg">
        Al guardar, avisaremos a <strong>{p.studentCount}</strong> {p.studentCount === 1 ? "estudiante inscrita" : "estudiantes inscritas"} en el campus, y por correo o WhatsApp según sus preferencias.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="starts_at" className="mb-2 block text-lg font-medium">Inicia</label>
          <input id="starts_at" name="starts_at" type="datetime-local" defaultValue={p.startsAt} required className={input} />
        </div>
        <div>
          <label htmlFor="ends_at" className="mb-2 block text-lg font-medium">Termina</label>
          <input id="ends_at" name="ends_at" type="datetime-local" defaultValue={p.endsAt} required className={input} />
        </div>
      </div>
      <p className="-mt-3 text-muted">Hora de Colombia.</p>

      <div>
        <label htmlFor="location" className="mb-2 block text-lg font-medium">Lugar (opcional)</label>
        <input id="location" name="location" defaultValue={p.location} className={input} />
      </div>
      <div>
        <label htmlFor="online_url" className="mb-2 block text-lg font-medium">Enlace de la clase en línea (opcional)</label>
        <input id="online_url" name="online_url" type="url" defaultValue={p.onlineUrl} inputMode="url" className={input} />
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-lg font-medium">Estado de la clase</legend>
        <label className="flex items-center gap-3 text-lg">
          <input type="radio" name="status" value="scheduled" defaultChecked={!p.cancelled} className="h-6 w-6 accent-[#7a4a45]" />
          Se realiza
        </label>
        <label className="flex items-center gap-3 text-lg">
          <input type="radio" name="status" value="cancelled" defaultChecked={p.cancelled} className="h-6 w-6 accent-[#7a4a45]" />
          Cancelar esta clase
        </label>
      </fieldset>

      <div>
        <label htmlFor="reason" className="mb-2 block text-lg font-medium">Motivo del cambio (lo verán tus estudiantes)</label>
        <textarea id="reason" name="reason" required minLength={3} maxLength={500} rows={3} className={`${input} py-3`} />
      </div>

      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        {pending ? "Guardando y avisando…" : "Guardar y avisar a mis estudiantes"}
      </button>
      <p role="alert" aria-live="assertive" className="text-lg text-red-800">{state.error}</p>
    </form>
  );
}
