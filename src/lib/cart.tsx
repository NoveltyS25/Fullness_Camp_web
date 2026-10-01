"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
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

const EMPTY: CartState = { slugs: [], couponCode: "" };

/** El carrito vive en localStorage; se lee con useSyncExternalStore para no romper el HTML del servidor. */
let cached: CartState = EMPTY;
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): CartState {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<CartState>;
    const slugs = (Array.isArray(parsed.slugs) ? parsed.slugs : []).filter((s): s is string => {
      const p = typeof s === "string" ? getProgram(s) : undefined;
      return !!p && isPurchasable(p);
    });
    return { slugs, couponCode: typeof parsed.couponCode === "string" ? parsed.couponCode : "" };
  } catch {
    return EMPTY;
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedRaw; // almacenamiento bloqueado: se usa lo que hay en memoria
  }
}

function getSnapshot(): CartState {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function write(next: CartState) {
  const raw = JSON.stringify(next);
  cachedRaw = raw;
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    /* sin almacenamiento: el carrito sigue funcionando mientras la pestaña esté abierta */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && listener();
  window.addEventListener("storage", onStorage); // sincroniza varias pestañas
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const add = useCallback((slug: string) => {
    const p = getProgram(slug);
    const current = getSnapshot();
    if (!p || !isPurchasable(p) || current.slugs.includes(slug)) return;
    write({ ...current, slugs: [...current.slugs, slug] });
  }, []);
  const remove = useCallback((slug: string) => {
    const current = getSnapshot();
    write({ ...current, slugs: current.slugs.filter((x) => x !== slug) });
  }, []);
  const setCouponCode = useCallback((couponCode: string) => write({ ...getSnapshot(), couponCode }), []);
  const clear = useCallback(() => write(EMPTY), []);

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
