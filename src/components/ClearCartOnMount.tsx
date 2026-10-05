"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

/** Vacía el carrito cuando el pago ya quedó confirmado. */
export function ClearCartOnMount() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
