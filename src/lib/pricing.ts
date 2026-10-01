import { findCoupon } from "../data/coupons.ts";
import { getProgram, isPurchasable, type ProgramCategory } from "../data/programs.ts";

/**
 * Descuento automático por pagar el valor completo en un solo pago (tarjeta, vía Bold).
 * Retiros y clases: sin descuento automático; los retiros solo bajan de precio con un cupón.
 */
export const PAY_IN_FULL_PERCENT: Record<ProgramCategory, number> = {
  certificacion: 15,
  taller: 10,
  retiro: 0,
  clases: 0,
};

export type CouponStatus = "none" | "applied" | "invalid" | "not-better";

export interface PricedItem {
  slug: string;
  title: string;
  category: ProgramCategory;
  listPrice: number;
}

export interface QuoteLine extends PricedItem {
  discountPercent: number;
  discount: number;
  total: number;
}

export interface Quote {
  lines: QuoteLine[];
  /** Slugs que no se pueden comprar (próximamente, sin precio o inexistentes). */
  unavailable: string[];
  subtotal: number;
  discount: number;
  total: number;
  couponStatus: CouponStatus;
  couponLabel: string;
}

/** Regla pura de precios, sin leer el catálogo. Valores en COP enteros. */
export function priceItems(items: PricedItem[], couponCode?: string | null, now = new Date()): Omit<Quote, "unavailable"> {
  const coupon = couponCode?.trim() ? findCoupon(couponCode, now) : undefined;
  const initialStatus: CouponStatus = couponCode?.trim() ? (coupon ? "not-better" : "invalid") : "none";
  let couponStatus = initialStatus as CouponStatus;

  const lines: QuoteLine[] = items.map((item) => {
    const auto = PAY_IN_FULL_PERCENT[item.category];
    let percent = auto;
    const couponApplies = coupon && (!coupon.categories || coupon.categories.includes(item.category));
    if (coupon && couponApplies) {
      const withCoupon = coupon.stackable ? Math.min(100, auto + coupon.percent) : Math.max(auto, coupon.percent);
      if (withCoupon > auto) couponStatus = "applied";
      percent = withCoupon;
    }
    const discount = Math.round((item.listPrice * percent) / 100);
    return { ...item, discountPercent: percent, discount, total: item.listPrice - discount };
  });

  const subtotal = lines.reduce((s, l) => s + l.listPrice, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  return {
    lines,
    subtotal,
    discount,
    total: subtotal - discount,
    couponStatus,
    couponLabel: couponStatus === "applied" && coupon ? coupon.label : "",
  };
}

/** Cotiza una lista de slugs con el catálogo real. Se usa igual en el navegador y en el servidor. */
export function priceCart(slugs: string[], couponCode?: string | null, now = new Date()): Quote {
  const items: PricedItem[] = [];
  const unavailable: string[] = [];

  for (const slug of new Set(slugs)) {
    const program = getProgram(slug);
    if (program && isPurchasable(program)) {
      items.push({ slug, title: program.title, category: program.category, listPrice: program.priceCOP });
    } else {
      unavailable.push(slug);
    }
  }
  return { ...priceItems(items, couponCode, now), unavailable };
}

export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
