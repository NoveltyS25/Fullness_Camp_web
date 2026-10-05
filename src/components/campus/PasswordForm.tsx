"use client";

import { useActionState, useState } from "react";
import { submitWith } from "@/lib/form";
import type { FormState } from "@/app/campus/actions";

const input = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";

/** Crear o cambiar contraseña. Sirve para el primer ingreso, el cambio voluntario y la recuperación. */
export function PasswordForm({
  action,
  submitLabel,
  askCurrent = false,
  token,
  initialError,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  askCurrent?: boolean;
  token?: string;
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, initialError ? { error: initialError } : {});
  const [show, setShow] = useState(false);
  const type = show ? "text" : "password";

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-5">
      {token && <input type="hidden" name="token" value={token} />}
      {askCurrent && (
        <div>
          <label htmlFor="current_password" className="mb-2 block text-lg font-medium">Contraseña actual</label>
          <input id="current_password" name="current_password" type={type} autoComplete="current-password" required className={input} />
        </div>
      )}
      <div>
        <label htmlFor="new_password" className="mb-2 block text-lg font-medium">Contraseña nueva</label>
        <input id="new_password" name="new_password" type={type} autoComplete="new-password" required minLength={8} aria-describedby="pw-help" className={input} />
        <p id="pw-help" className="mt-1 text-muted">Mínimo 8 caracteres, con al menos una letra y un número.</p>
      </div>
      <div>
        <label htmlFor="confirm_password" className="mb-2 block text-lg font-medium">Repite la contraseña nueva</label>
        <input id="confirm_password" name="confirm_password" type={type} autoComplete="new-password" required className={input} />
      </div>
      <label className="flex items-center gap-3 text-lg">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-6 w-6 accent-[#7a4a45]" />
        Mostrar contraseñas
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Guardando…" : submitLabel}
      </button>
      <p role="alert" aria-live="assertive" className="text-lg text-red-800">{state.error}</p>
    </form>
  );
}
