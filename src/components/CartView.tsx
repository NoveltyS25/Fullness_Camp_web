"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/pricing";

export function CartView() {
  const { quote, couponCode, setCouponCode, remove } = useCart();
  const [draft, setDraft] = useState(couponCode);

  if (quote.lines.length === 0) {
    return (
      <div className="rounded-3xl border border-clay-soft bg-white p-8 text-center">
        <p className="mb-6 text-xl">Tu carrito está vacío.</p>
        <Link href="/programas" className="btn btn-primary">Ver programas</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ul className="space-y-4">
        {quote.lines.map((l) => (
          <li key={l.slug} className="rounded-3xl border border-clay-soft bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <Link href={`/programas/${l.slug}`} className="text-lg font-bold text-clay-dark">{l.title}</Link>
              <button type="button" onClick={() => remove(l.slug)} className="min-h-12 shrink-0 rounded-full px-4 text-clay-dark underline hover:bg-clay-soft" aria-label={`Quitar ${l.title}`}>
                Quitar
              </button>
            </div>
            <p className="mt-2">
              {l.discountPercent > 0 && <span className="mr-2 text-muted line-through">{formatCOP(l.listPrice)}</span>}
              <span className="text-xl font-bold">{formatCOP(l.total)}</span>
              {l.discountPercent > 0 && <span className="ml-2 text-muted">({l.discountPercent}% de descuento)</span>}
            </p>
          </li>
        ))}
      </ul>

      <form
        className="rounded-3xl border border-clay-soft bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setCouponCode(draft.trim());
        }}
      >
        <label htmlFor="cupon" className="mb-2 block font-medium">¿Tienes un bono o cupón?</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input id="cupon" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" className="min-h-14 flex-1 rounded-xl border-2 border-clay-soft px-4 text-lg uppercase" />
          <button type="submit" className="btn btn-secondary">Aplicar</button>
        </div>
        <p className="mt-3" role="status">
          {quote.couponStatus === "invalid" && <span className="text-red-800">Ese código no es válido o ya venció.</span>}
          {quote.couponStatus === "not-better" && <span className="text-muted">El código es válido, pero ya tienes un descuento igual o mayor.</span>}
          {quote.couponStatus === "applied" && <span className="font-medium text-clay-dark">✓ {quote.couponLabel} aplicado.</span>}
        </p>
      </form>

      <dl className="space-y-2 rounded-3xl bg-clay-soft p-6 text-lg">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCOP(quote.subtotal)}</dd></div>
        <div className="flex justify-between"><dt>Descuento</dt><dd>− {formatCOP(quote.discount)}</dd></div>
        <div className="flex justify-between border-t border-clay-dark/30 pt-3 text-2xl font-bold text-clay-dark"><dt>Total a pagar</dt><dd>{formatCOP(quote.total)}</dd></div>
      </dl>

      <div className="space-y-3">
        <Link href="/checkout" className="btn btn-primary w-full">Continuar al pago</Link>
        <p className="text-center text-muted">Pagas una sola vez con tarjeta. Si quieres cuotas, las difieres con tu banco.</p>
      </div>
    </div>
  );
}
