"use client";

import { useActionState } from "react";
import { submitWith } from "@/lib/form";
import { recoverAction, type FormState } from "@/app/campus/actions";

const input = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";

export function RecoverForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(recoverAction, {});
  return (
    <form onSubmit={submitWith(action)} className="space-y-5">
      <div>
        <label htmlFor="cedula" className="mb-2 block text-lg font-medium">Cédula</label>
        <input id="cedula" name="cedula" inputMode="numeric" required className={input} />
      </div>
      <div>
        <label htmlFor="email" className="mb-2 block text-lg font-medium">Correo con el que te inscribiste</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={input} />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Enviando…" : "Enviarme el enlace"}
      </button>
      <p role="status" aria-live="polite" className="text-lg">
        {state.error && <span className="text-red-800">{state.error}</span>}
        {state.message && <span className="font-medium text-clay-dark">{state.message}</span>}
      </p>
    </form>
  );
}
