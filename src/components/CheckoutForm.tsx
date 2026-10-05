"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitWith } from "@/lib/form";
import { startCheckoutAction, type CheckoutState } from "@/app/(site)/checkout/actions";
import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/pricing";

const input = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";

const steps = [
  { n: 1, t: "Pagas con tarjeta", d: "En una página segura de pago." },
  { n: 2, t: "Te llega un correo", d: "Con el paso a paso para entrar al campus virtual." },
  { n: 3, t: "Entras con tu cédula", d: "Creas tu propia contraseña y ves tus clases." },
];

export function CheckoutForm() {
  const { quote, slugs, couponCode } = useCart();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckoutAction, {});

  if (quote.lines.length === 0) {
    return (
      <div className="rounded-3xl border border-clay-soft bg-white p-8 text-center">
        <p className="mb-6 text-xl">Tu carrito está vacío.</p>
        <Link href="/programas" className="btn btn-primary">Ver programas</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <form onSubmit={submitWith(action)} className="space-y-6">
        <input type="hidden" name="slugs" value={JSON.stringify(slugs)} />
        <input type="hidden" name="coupon" value={couponCode} />

        <h2 className="text-2xl font-bold">Tus datos</h2>
        <p className="text-muted">Con tu cédula se crea tu cuenta del campus virtual. Revisa que el correo esté bien escrito: ahí llegará el acceso.</p>

        <div>
          <label htmlFor="name" className="mb-2 block text-lg font-medium">Nombre y apellido</label>
          <input id="name" name="name" required autoComplete="name" className={input} />
        </div>
        <div>
          <label htmlFor="cedula" className="mb-2 block text-lg font-medium">Cédula</label>
          <input id="cedula" name="cedula" required inputMode="numeric" autoComplete="off" aria-describedby="ced-help" className={input} />
          <p id="ced-help" className="mt-1 text-muted">Solo números. Será tu usuario para entrar al campus.</p>
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-lg font-medium">Correo electrónico</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={input} />
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-lg font-medium">WhatsApp (opcional)</label>
          <input id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="311 674 1900" aria-describedby="wa-help" className={input} />
          <p id="wa-help" className="mt-1 text-muted">Para avisarte si cambia el horario de una clase.</p>
        </div>

        <label className="flex gap-3 text-lg">
          <input type="checkbox" name="terms" required className="mt-1 h-6 w-6 shrink-0 accent-[#7a4a45]" />
          <span>Acepto los términos y condiciones y la política de privacidad. <span className="text-muted">(Los textos legales se publicarán antes del lanzamiento.)</span></span>
        </label>

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "Preparando tu pago…" : `Ir a pagar ${formatCOP(quote.total)}`}
        </button>
        <p role="alert" aria-live="assertive" className="text-lg text-red-800">{state.error}</p>
      </form>

      <aside className="space-y-6">
        <section aria-labelledby="resumen" className="rounded-3xl border border-clay-soft bg-white p-6">
          <h2 id="resumen" className="mb-4 text-xl font-bold">Resumen</h2>
          <ul className="space-y-3">
            {quote.lines.map((l) => (
              <li key={l.slug} className="flex justify-between gap-3">
                <span>{l.title}</span>
                <span className="shrink-0 font-medium">{formatCOP(l.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-clay-soft pt-4">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCOP(quote.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Descuento</dt><dd>− {formatCOP(quote.discount)}</dd></div>
            <div className="flex justify-between text-xl font-bold text-clay-dark"><dt>Total</dt><dd>{formatCOP(quote.total)}</dd></div>
          </dl>
          <p className="mt-3 text-sm text-muted">Pago único con tarjeta. Si quieres cuotas, difiérelas con tu banco al pagar.</p>
        </section>

        <section aria-labelledby="despues" className="rounded-3xl bg-clay-soft p-6">
          <h2 id="despues" className="mb-4 text-xl font-bold">¿Qué pasa después de pagar?</h2>
          <ol className="space-y-4">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay-dark font-bold text-white">{s.n}</span>
                <span><strong>{s.t}</strong><br /><span className="text-muted">{s.d}</span></span>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
