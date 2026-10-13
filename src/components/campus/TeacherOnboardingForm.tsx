"use client";

import { useActionState } from "react";
import { completeTeacherOnboardingAction, type FormState } from "@/app/campus/actions";
import { CertificationPicker } from "@/components/campus/CertificationPicker";
import { submitWith } from "@/lib/form";

const input = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";

export function TeacherOnboardingForm({ fullName, email, options }: { fullName: string; email: string; options: { slug: string; title: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(completeTeacherOnboardingAction, {});

  return (
    <form onSubmit={submitWith(action)} className="space-y-6">
      <div>
        <label htmlFor="ob-name" className="mb-2 block text-lg font-medium">Nombre completo</label>
        <input id="ob-name" name="full_name" required defaultValue={fullName} autoComplete="name" className={input} />
      </div>
      <div>
        <label htmlFor="ob-cedula" className="mb-2 block text-lg font-medium">Número de cédula</label>
        <input id="ob-cedula" name="cedula" inputMode="numeric" required className={input} />
        <p className="mt-2 text-base text-muted">Con este número ingresarás al campus de ahora en adelante.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ob-email" className="mb-2 block text-lg font-medium">Correo para que te contacten tus estudiantes</label>
          <input id="ob-email" name="contact_email" type="email" required defaultValue={email} className={input} />
        </div>
        <div>
          <label htmlFor="ob-phone" className="mb-2 block text-lg font-medium">Celular (WhatsApp) para tus estudiantes</label>
          <input id="ob-phone" name="contact_phone" inputMode="tel" required autoComplete="tel" placeholder="311 674 1900" className={input} />
        </div>
      </div>
      <CertificationPicker options={options} selected={[]} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">{pending ? "Guardando…" : "Guardar y entrar al campus"}</button>
      <p role="alert" aria-live="assertive" className="text-lg text-red-800">{state.error}</p>
    </form>
  );
}
