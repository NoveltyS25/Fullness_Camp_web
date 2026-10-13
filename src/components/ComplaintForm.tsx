"use client";

import { useActionState } from "react";
import { createComplaintAction, type ComplaintState } from "@/app/(site)/quejas/actions";
import { KINDS } from "@/lib/complaint-kinds";
import { submitWith } from "@/lib/form";

const input = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";
const area = "w-full rounded-xl border-2 border-clay-soft bg-white p-4 text-lg";

export function ComplaintForm() {
  const [state, action, pending] = useActionState<ComplaintState, FormData>(createComplaintAction, {});

  return (
    <form onSubmit={submitWith(action)} className="space-y-6">
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="q-web">No llenar</label>
        <input id="q-web" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg font-medium">¿Qué quieres reportar?</legend>
        {Object.entries(KINDS).map(([value, label], i) => (
          <label key={value} className="flex items-start gap-3 text-lg">
            <input type="radio" name="kind" value={value} required defaultChecked={i === 0} className="mt-1.5 h-5 w-5 accent-[#7a4a45]" />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="q-name" className="mb-2 block text-lg font-medium">Tu nombre completo</label>
          <input id="q-name" name="name" required autoComplete="name" className={input} />
        </div>
        <div>
          <label htmlFor="q-email" className="mb-2 block text-lg font-medium">Tu correo electrónico</label>
          <input id="q-email" name="email" type="email" required autoComplete="email" className={input} />
        </div>
        <div>
          <label htmlFor="q-phone" className="mb-2 block text-lg font-medium">Teléfono <span className="font-normal text-muted">(opcional)</span></label>
          <input id="q-phone" name="phone" inputMode="tel" autoComplete="tel" className={input} />
        </div>
        <div>
          <label htmlFor="q-accused" className="mb-2 block text-lg font-medium">Persona sobre quien presentas la queja</label>
          <input id="q-accused" name="accused" required className={input} />
        </div>
      </div>

      <div>
        <label htmlFor="q-desc" className="mb-2 block text-lg font-medium">Describe lo ocurrido</label>
        <textarea id="q-desc" name="description" required rows={7} minLength={30} className={area} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="q-date" className="mb-2 block text-lg font-medium">¿Cuándo ocurrió? <span className="font-normal text-muted">(opcional)</span></label>
          <input id="q-date" name="event_date" placeholder="Ej.: 12 de octubre" className={input} />
        </div>
        <div>
          <label htmlFor="q-place" className="mb-2 block text-lg font-medium">¿Dónde? <span className="font-normal text-muted">(opcional)</span></label>
          <input id="q-place" name="event_place" placeholder="Ej.: sede Bogotá, en línea" className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="q-wit" className="mb-2 block text-lg font-medium">Testigos o evidencias <span className="font-normal text-muted">(opcional)</span></label>
        <textarea id="q-wit" name="witnesses" rows={3} className={area} placeholder="Nombres y contacto de testigos, o qué evidencia existe (mensajes, fotos…). Si hace falta, te pediremos los archivos después." />
      </div>

      <label className="flex gap-3 text-base">
        <input type="checkbox" name="consent" required className="mt-1 h-6 w-6 shrink-0 accent-[#7a4a45]" />
        <span>Declaro que lo que cuento es cierto según mi conocimiento y autorizo a Fullness Camp a tratar estos datos para revisar mi solicitud. <span className="text-muted">(La política de tratamiento de datos se publicará antes del lanzamiento.)</span></span>
      </label>

      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">{pending ? "Enviando…" : "Enviar de forma confidencial"}</button>
      <p role="alert" aria-live="assertive" className="text-lg text-red-800">{state.error}</p>
    </form>
  );
}
