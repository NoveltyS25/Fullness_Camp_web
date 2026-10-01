"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function AddToCartButton({ slug }: { slug: string }) {
  const { slugs, add } = useCart();
  const inCart = slugs.includes(slug);

  if (inCart) {
    return (
      <div className="space-y-2" role="status">
        <p className="font-medium text-clay-dark">✓ Agregado a tu carrito</p>
        <Link href="/carrito" className="btn btn-primary">Ir al carrito</Link>
      </div>
    );
  }
  return (
    <button type="button" className="btn btn-primary" onClick={() => add(slug)}>
      Agregar al carrito
    </button>
  );
}
