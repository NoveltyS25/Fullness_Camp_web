"use client";

import { useActionState } from "react";
import { saveTeacherProfileAction, type FormState } from "@/app/campus/actions";
import { submitWith } from "@/lib/form";
import type { TeacherProfile } from "@/server/curriculum";

const input = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";

export function TeacherProfileForm({ profile }: { profile?: TeacherProfile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTeacherProfileAction, {});

  return (
    <form onSubmit={submitWith(action)} className="space-y-5">
      <div>
        <label htmlFor="tp-headline" className="mb-2 block text-lg font-medium">Tu especialidad o cargo</label>
        <input id="tp-headline" name="headline" defaultValue={profile?.headline ?? ""} placeholder="Ej.: Fisioterapeuta · Anatomía en yoga" className={input} />
      </div>
      <div>
        <label htmlFor="tp-bio" className="mb-2 block text-lg font-medium">Sobre ti</label>
        <textarea id="tp-bio" name="bio" rows={5} defaultValue={profile?.bio ?? ""} className="w-full rounded-xl border-2 border-clay-soft bg-white p-4 text-lg" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="tp-email" className="mb-2 block text-lg font-medium">Correo de contacto</label>
          <input id="tp-email" name="contact_email" type="email" defaultValue={profile?.contact_email ?? ""} className={input} />
        </div>
        <div>
          <label htmlFor="tp-phone" className="mb-2 block text-lg font-medium">WhatsApp de contacto</label>
          <input id="tp-phone" name="contact_phone" inputMode="tel" defaultValue={profile?.contact_phone ?? ""} className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="tp-photo" className="mb-2 block text-lg font-medium">Enlace de tu foto <span className="font-normal text-muted">(subir archivos llegará pronto)</span></label>
        <input id="tp-photo" name="photo_url" type="url" defaultValue={profile?.photo_url ?? ""} placeholder="https://…" className={input} />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Guardando…" : "Guardar mi perfil de docente"}</button>
      <p role="status" aria-live="polite" className="text-lg">
        {state.error && <span className="text-red-800">{state.error}</span>}
        {state.message && <span className="font-medium text-clay-dark">{state.message}</span>}
      </p>
    </form>
  );
}
