"use client";

import { useActionState, useState } from "react";
import { createClassAction } from "@/app/campus/(app)/profesor/actions";
import type { FormState } from "@/app/campus/actions";
import { submitWith } from "@/lib/form";

const field = "min-h-12 w-full rounded-xl border-2 border-clay-soft bg-white px-3 text-lg";

/** Crear una clase con su primer horario: todos los campos son obligatorios (lugar y enlace según la modalidad). */
export function NewClassForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createClassAction, {});
  const [modality, setModality] = useState("virtual");
  const needsPlace = modality !== "virtual";
  const needsLink = modality !== "presencial";

  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-lg font-medium">Nombre de la clase</span>
        <input name="title" required minLength={2} maxLength={160} className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block text-lg font-medium">Modalidad</span>
        <select name="modality" value={modality} onChange={(e) => setModality(e.target.value)} required className={field}>
          <option value="virtual">Virtual</option>
          <option value="presencial">Presencial</option>
          <option value="mixta">Presencial y virtual</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-lg font-medium">Descripción</span>
        <textarea name="description" required minLength={5} rows={3} maxLength={600} className="w-full rounded-xl border-2 border-clay-soft bg-white p-3 text-lg" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-lg font-medium">Primera clase inicia</span>
          <input name="starts_at" type="datetime-local" required className={field} />
        </label>
        <label>
          <span className="mb-1 block text-lg font-medium">Termina</span>
          <input name="ends_at" type="datetime-local" required className={field} />
        </label>
      </div>
      <p className="-mt-2 text-muted">Hora de Colombia.</p>
      <label className="block">
        <span className="mb-1 block text-lg font-medium">¿Cuántas semanas se repite?</span>
        <input name="weeks" type="number" min={1} max={40} defaultValue={1} required className={field} />
        <span className="mt-1 block text-muted">1 = una sola clase. Con 8 se crean 8 clases, una por semana, a la misma hora.</span>
      </label>

      {needsPlace && (
        <label className="block">
          <span className="mb-1 block text-lg font-medium">Lugar</span>
          <input name="location" required placeholder="Ej.: sede Bogotá, calle 127" className={field} />
        </label>
      )}
      {needsLink && (
        <label className="block">
          <span className="mb-1 block text-lg font-medium">Enlace de la clase (Meet)</span>
          <input name="online_url" type="url" required placeholder="https://meet.google.com/…" className={field} />
        </label>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Guardando…" : "Agregar clase"}</button>
      <p role="alert" aria-live="assertive" className="text-lg text-red-800">{state.error}</p>
    </form>
  );
}
