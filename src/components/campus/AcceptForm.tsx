"use client";

import { useActionState } from "react";
import { acceptDocumentsAction, type FormState } from "@/app/campus/actions";
import { AcceptanceFields } from "@/components/AcceptanceFields";
import type { PoliticaKey } from "@/data/politicas";
import { submitWith } from "@/lib/form";

/** Aceptación de contrato y políticas dentro del campus (primera vez que entra, o cuando cambia un documento). */
export function AcceptForm({ keys }: { keys: PoliticaKey[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(acceptDocumentsAction, {});
  return (
    <form onSubmit={submitWith(action)} className="space-y-6">
      <AcceptanceFields keys={keys} idPrefix="campus" />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">{pending ? "Guardando…" : "Aceptar y entrar al campus"}</button>
      <p role="alert" aria-live="assertive" className="text-lg text-red-800">{state.error}</p>
    </form>
  );
}
