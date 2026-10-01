"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const { slugs } = useCart();
  return (
    <Link
      href="/carrito"
      className="relative inline-flex min-h-12 items-center gap-2 rounded-full px-4 font-medium text-clay-dark hover:bg-clay-soft"
      aria-label={`Carrito, ${slugs.length} ${slugs.length === 1 ? "programa" : "programas"}`}
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.76L20 8H6.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9.5" cy="20" r="1.2" fill="currentColor" />
        <circle cx="17" cy="20" r="1.2" fill="currentColor" />
      </svg>
      <span>Carrito</span>
      {slugs.length > 0 && (
        <span className="grid h-7 min-w-7 place-items-center rounded-full bg-clay-dark px-1.5 text-sm text-white">
          {slugs.length}
        </span>
      )}
    </Link>
  );
}
