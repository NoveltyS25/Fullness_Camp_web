import { findCoupon } from "../data/coupons.ts";
import { getProgram, isPurchasable } from "../data/programs.ts";

/** Descuento automático por pagar el valor completo en un solo pago (con tarjeta, vía Bold). */
export const PAY_IN_FULL_PERCENT = 15;

export type CouponStatus = "none" | "applied" | "invalid" | "not-better";

export interface QuoteLine {
  slug: string;
  title: string;
  listPrice: number;
}

export interface Quote {
  lines: QuoteLine[];
  /** Slugs que no se pueden comprar (próximamente, sin precio o inexistentes). */
  unavailable: string[];
  subtotal: number;
  discountPercent: number;
  discountLabel: string;
  discount: number;
  total: number;
  couponStatus: CouponStatus;
}

/** Calcula el precio en el servidor y en el cliente con las mismas reglas. Valores en COP enteros. */
export function priceCart(slugs: string[], couponCode?: string | null, now = new Date()): Quote {
  const lines: QuoteLine[] = [];
  const unavailable: string[] = [];

  for (const slug of new Set(slugs)) {
    const program = getProgram(slug);
    if (program && isPurchasable(program)) {
      lines.push({ slug, title: program.title, listPrice: program.priceCOP });
    } else {
      unavailable.push(slug);
    }
  }

  const subtotal = lines.reduce((sum, l) => sum + l.listPrice, 0);

  let discountPercent = lines.length ? PAY_IN_FULL_PERCENT : 0;
  let discountLabel = lines.length ? "Descuento por pago único" : "";
  let couponStatus: CouponStatus = "none";

  if (couponCode?.trim()) {
    const coupon = findCoupon(couponCode, now);
    if (!coupon) {
      couponStatus = "invalid";
    } else if (coupon.stackable) {
      discountPercent = Math.min(100, discountPercent + coupon.percent);
      discountLabel = `Pago único + ${coupon.label}`;
      couponStatus = "applied";
    } else if (coupon.percent > discountPercent) {
      discountPercent = coupon.percent;
      discountLabel = coupon.label;
      couponStatus = "applied";
    } else {
      couponStatus = "not-better";
    }
  }

  const discount = Math.round((subtotal * discountPercent) / 100);
  return {
    lines,
    unavailable,
    subtotal,
    discountPercent,
    discountLabel,
    discount,
    total: subtotal - discount,
    couponStatus,
  };
}

export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
