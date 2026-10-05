"use client";

import { useActionState } from "react";
import { submitWith } from "@/lib/form";
import { updateProfileAction, type FormState } from "@/app/campus/actions";

const input = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";
const check = "mt-1 h-6 w-6 shrink-0 accent-[#7a4a45]";

interface Props {
  fullName: string;
  cedula: string;
  email: string;
  whatsappPhone: string | null;
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
}

export function ProfileForm(p: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfileAction, {});

  return (
    <form onSubmit={submitWith(action)} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <span className="mb-2 block text-lg font-medium">Cédula</span>
          <p className="min-h-14 rounded-xl bg-clay-soft px-4 py-3 text-lg">{p.cedula}</p>
        </div>
        <div>
          <span className="mb-2 block text-lg font-medium">Correo</span>
          <p className="min-h-14 break-all rounded-xl bg-clay-soft px-4 py-3 text-lg">{p.email}</p>
        </div>
      </div>

      <div>
        <label htmlFor="full_name" className="mb-2 block text-lg font-medium">Nombre completo</label>
        <input id="full_name" name="full_name" defaultValue={p.fullName} required autoComplete="name" className={input} />
      </div>

      <div>
        <label htmlFor="whatsapp_phone" className="mb-2 block text-lg font-medium">Número de WhatsApp</label>
        <input id="whatsapp_phone" name="whatsapp_phone" defaultValue={p.whatsappPhone ?? ""} inputMode="tel" autoComplete="tel" placeholder="311 674 1900" aria-describedby="wa-help" className={input} />
        <p id="wa-help" className="mt-1 text-muted">Si vives fuera de Colombia, escríbelo con el indicativo de tu país.</p>
      </div>

      <fieldset className="space-y-4 rounded-2xl border border-clay-soft bg-white p-5">
        <legend className="px-2 text-lg font-bold text-clay-dark">¿Cómo quieres que te avisemos?</legend>
        <p className="text-muted">Los avisos dentro del campus siempre se muestran. Si cambia el horario de una clase, también podemos escribirte:</p>
        <label className="flex gap-3 text-lg">
          <input type="checkbox" name="notify_email" defaultChecked={p.notifyEmail} className={check} />
          <span>Por correo electrónico</span>
        </label>
        <label className="flex gap-3 text-lg">
          <input type="checkbox" name="notify_whatsapp" defaultChecked={p.notifyWhatsapp} className={check} />
          <span>Por WhatsApp</span>
        </label>
      </fieldset>

      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">{pending ? "Guardando…" : "Guardar"}</button>
      <p role="status" aria-live="polite" className="text-lg">
        {state.error && <span className="text-red-800">{state.error}</span>}
        {state.message && <span className="font-medium text-clay-dark">{state.message}</span>}
      </p>
    </form>
  );
}
