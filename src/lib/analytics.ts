/**
 * Eventos de medición. No carga ningún script externo: solo empuja los eventos a `window.dataLayer`, que es
 * lo que leen Google Tag Manager, GA4 y el píxel de Meta cuando se instalen (con el consentimiento que
 * corresponda). Los nombres siguen el estándar de comercio electrónico de GA4.
 */
type Primitive = string | number | boolean | undefined;
type Params = Record<string, Primitive | Record<string, Primitive>[]>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function track(event: string, params: Params = {}): void {
  if (typeof window === "undefined") return;
  (window.dataLayer ??= []).push({ event, ...params });
}

export function itemParams(item: { slug: string; title: string; price: number | null; category?: string }) {
  return {
    currency: "COP",
    value: item.price ?? 0,
    items: [{ item_id: item.slug, item_name: item.title, price: item.price ?? 0, item_category: item.category }],
  };
}
