// Bonos / cupones de descuento. Para una promo nueva: cambia el nombre, el porcentaje,
// las fechas y pon active: true. Los cupones se validan SIEMPRE en el servidor.

export interface Coupon {
  code: string; // se compara sin importar mayúsculas
  label: string;
  percent: number; // 0-100
  active: boolean;
  /** Fechas ISO (opcionales). Fuera de este rango el bono no se acepta. */
  startsAt?: string;
  endsAt?: string;
  /**
   * false (por defecto): el cliente recibe el MAYOR entre el descuento por pago único y este bono.
   * true: el bono se suma al descuento por pago único.
   */
  stackable?: boolean;
}

export const coupons: Coupon[] = [
  {
    code: "BONO-PROMO",
    label: "Bono promocional 15%",
    percent: 15,
    active: true,
    stackable: false,
  },
];

export function findCoupon(code: string | null | undefined, now = new Date()): Coupon | undefined {
  const wanted = code?.trim().toUpperCase();
  if (!wanted) return undefined;
  return coupons.find((c) => {
    if (c.code.toUpperCase() !== wanted || !c.active) return false;
    if (c.startsAt && now < new Date(c.startsAt)) return false;
    if (c.endsAt && now > new Date(c.endsAt)) return false;
    return true;
  });
}
