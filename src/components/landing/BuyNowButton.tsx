"use client";

import { useRouter } from "next/navigation";
import { itemParams, track } from "@/lib/analytics";
import { useCart } from "@/lib/cart";

/** Un solo paso: agrega el programa y lleva directo al checkout (sin pasar por el carrito). */
export function BuyNowButton({
  slug,
  title,
  price,
  category,
  label = "Inscribirme ahora",
  className = "btn btn-primary",
  where,
}: {
  slug: string;
  title: string;
  price: number;
  category: string;
  label?: string;
  className?: string;
  /** Dónde está el botón, para medir cuál convierte mejor. */
  where: "hero" | "pricing" | "sticky" | "final";
}) {
  const router = useRouter();
  const { add } = useCart();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        add(slug);
        track("add_to_cart", { ...itemParams({ slug, title, price, category }), cta_location: where });
        router.push("/checkout");
      }}
    >
      {label}
    </button>
  );
}
