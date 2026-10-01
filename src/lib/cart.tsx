"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProgram, isPurchasable } from "../data/programs";
import { priceCart, type Quote } from "./pricing";

const STORAGE_KEY = "fullness-camp-cart";

interface CartState {
  slugs: string[];
  couponCode: string;
}

interface CartContextValue {
  slugs: string[];
  couponCode: string;
  quote: Quote;
  add: (slug: string) => void;
  remove: (slug: string) => void;
  setCouponCode: (code: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function load(): CartState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { slugs: [], couponCode: "" };
    const parsed = JSON.parse(raw) as Partial<CartState>;
    const slugs = (Array.isArray(parsed.slugs) ? parsed.slugs : []).filter((s) => {
      const p = typeof s === "string" ? getProgram(s) : undefined;
      return p && isPurchasable(p);
    });
    return { slugs, couponCode: typeof parsed.couponCode === "string" ? parsed.couponCode : "" };
  } catch {
    return { slugs: [], couponCode: "" };
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>({ slugs: [], couponCode: "" });
  const [ready, setReady] = useState(false);

  // Se lee después de montar para no romper el HTML renderizado en el servidor.
  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* almacenamiento bloqueado: el carrito sigue funcionando en memoria */
    }
  }, [state, ready]);

  const add = useCallback((slug: string) => {
    const p = getProgram(slug);
    if (!p || !isPurchasable(p)) return;
    setState((s) => (s.slugs.includes(slug) ? s : { ...s, slugs: [...s.slugs, slug] }));
  }, []);
  const remove = useCallback(
    (slug: string) => setState((s) => ({ ...s, slugs: s.slugs.filter((x) => x !== slug) })),
    [],
  );
  const setCouponCode = useCallback((couponCode: string) => setState((s) => ({ ...s, couponCode })), []);
  const clear = useCallback(() => setState({ slugs: [], couponCode: "" }), []);

  const value = useMemo<CartContextValue>(
    () => ({
      slugs: state.slugs,
      couponCode: state.couponCode,
      quote: priceCart(state.slugs, state.couponCode),
      add,
      remove,
      setCouponCode,
      clear,
    }),
    [state, add, remove, setCouponCode, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
