"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { clearAttribution } from "@/lib/attribution";
import { useCart } from "@/lib/cart";

/** Cuando el pago ya quedó confirmado: vacía el carrito y registra la compra (una sola vez por pedido). */
export function ClearCartOnMount({ orderId, total, items }: { orderId: string; total: number; items: { slug: string; title: string; price: number }[] }) {
  const { clear } = useCart();
  useEffect(() => {
    clear();
    try {
      const key = `fc_purchase_${orderId}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        track("purchase", {
          transaction_id: orderId,
          value: total,
          currency: "COP",
          items: items.map((i) => ({ item_id: i.slug, item_name: i.title, price: i.price })),
        });
        clearAttribution();
      }
    } catch {
      /* sin almacenamiento: no se puede evitar un doble registro, pero la compra no se afecta */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clear, orderId]);
  return null;
}
