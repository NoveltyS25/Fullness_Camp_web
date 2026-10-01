"use client";

import { useActionState } from "react";
import { sendMagicLink, type FormState } from "@/app/campus/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, {});

  return (
    <form action={action} className="space-y-4">
      <label htmlFor="email" className="block text-lg font-medium">Tu correo electrónico</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        className="min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg"
      />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Enviando…" : "Enviarme el enlace para entrar"}
      </button>
      <p role="status" aria-live="polite" className="text-lg">
        {state.error && <span className="text-red-800">{state.error}</span>}
        {state.message && <span className="font-medium text-clay-dark">{state.message}</span>}
      </p>
    </form>
  );
}
