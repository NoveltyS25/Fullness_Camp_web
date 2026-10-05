"use client";

import { useActionState } from "react";
import { submitWith } from "@/lib/form";
import type { FormState } from "@/app/campus/actions";

export const inputClass = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";

/** Formulario genérico: muestra el error o el mensaje que devuelve la acción del servidor. */
export function ActionForm({
  action,
  submitLabel,
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-5">
      {children}
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        {pending ? "Guardando…" : submitLabel}
      </button>
      <p role="status" aria-live="polite" className="text-lg">
        {state.error && <span className="text-red-800">{state.error}</span>}
        {state.message && <span className="font-medium text-clay-dark">{state.message}</span>}
      </p>
    </form>
  );
}
