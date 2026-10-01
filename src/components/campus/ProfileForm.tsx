"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "@/app/campus/actions";
import type { Profile } from "@/lib/campus/auth";

const input = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";
const check = "mt-1 h-6 w-6 shrink-0 accent-[#7a4a45]";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});

  return (
    <form action={action} className="space-y-6">
      <div>
        <label htmlFor="full_name" className="mb-2 block text-lg font-medium">Nombre completo</label>
        <input id="full_name" name="full_name" defaultValue={profile.full_name} required autoComplete="name" className={input} />
      </div>

      <div>
        <label htmlFor="whatsapp_phone" className="mb-2 block text-lg font-medium">Número de WhatsApp</label>
        <input
          id="whatsapp_phone"
          name="whatsapp_phone"
          defaultValue={profile.whatsapp_phone ?? ""}
          inputMode="tel"
          autoComplete="tel"
          placeholder="311 674 1900"
          aria-describedby="wa-help"
          className={input}
        />
        <p id="wa-help" className="mt-1 text-muted">Si vives fuera de Colombia, escríbelo con el indicativo de tu país.</p>
      </div>

      <fieldset className="space-y-4 rounded-2xl border border-clay-soft bg-white p-5">
        <legend className="px-2 text-lg font-bold text-clay-dark">¿Cómo quieres que te avisemos?</legend>
        <p className="text-muted">Los avisos dentro del campus siempre se muestran. Si cambia el horario de una clase, también podemos escribirte:</p>
        <label className="flex gap-3 text-lg">
          <input type="checkbox" name="notify_email" defaultChecked={profile.notify_email} className={check} />
          <span>Por correo electrónico ({profile.email})</span>
        </label>
        <label className="flex gap-3 text-lg">
          <input type="checkbox" name="notify_whatsapp" defaultChecked={profile.notify_whatsapp} className={check} />
          <span>Por WhatsApp</span>
        </label>
      </fieldset>

      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        {pending ? "Guardando…" : "Guardar"}
      </button>
      <p role="status" aria-live="polite" className="text-lg">
        {state.error && <span className="text-red-800">{state.error}</span>}
        {state.message && <span className="font-medium text-clay-dark">{state.message}</span>}
      </p>
    </form>
  );
}
