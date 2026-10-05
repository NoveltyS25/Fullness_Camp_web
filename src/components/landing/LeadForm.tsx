"use client";

import { useActionState } from "react";
import { createLeadAction, type LeadState } from "@/app/(site)/programas/[slug]/actions";
import { track } from "@/lib/analytics";
import { readAttribution } from "@/lib/attribution";
import { submitWith } from "@/lib/form";

const input = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";

export function LeadForm({
  slug,
  interest,
  submitLabel,
  id,
}: {
  slug: string;
  interest: "info" | "waitlist";
  submitLabel: string;
  id?: string;
}) {
  const [state, action, pending] = useActionState<LeadState, FormData>(createLeadAction, {});
  const f = `${id ?? interest}-${slug}`;

  return (
    <form
      onSubmit={submitWith(action, (fd) => {
        fd.set("attribution", readAttribution());
        track("generate_lead", { item_id: slug, lead_type: interest });
      })}
      className="space-y-4"
      noValidate={false}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="interest" value={interest} />
      {/* Trampa para robots: una persona nunca lo ve ni lo llena. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${f}-web`}>No llenar</label>
        <input id={`${f}-web`} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor={`${f}-name`} className="mb-2 block text-lg font-medium">Nombre</label>
        <input id={`${f}-name`} name="name" required autoComplete="name" className={input} />
      </div>
      <div>
        <label htmlFor={`${f}-email`} className="mb-2 block text-lg font-medium">Correo electrónico</label>
        <input id={`${f}-email`} name="email" type="email" required autoComplete="email" className={input} />
      </div>
      <div>
        <label htmlFor={`${f}-wa`} className="mb-2 block text-lg font-medium">WhatsApp <span className="font-normal text-muted">(opcional)</span></label>
        <input id={`${f}-wa`} name="whatsapp" inputMode="tel" autoComplete="tel" placeholder="311 674 1900" className={input} />
      </div>
      <label className="flex gap-3 text-base">
        <input type="checkbox" name="consent" required className="mt-1 h-6 w-6 shrink-0 accent-[#7a4a45]" />
        <span>Acepto que Fullness Camp me contacte por correo o WhatsApp sobre este programa. <span className="text-muted">(La política de privacidad se publicará antes del lanzamiento.)</span></span>
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">{pending ? "Enviando…" : submitLabel}</button>
      <p role="alert" aria-live="assertive" className="text-lg text-red-800">{state.error}</p>
    </form>
  );
}
