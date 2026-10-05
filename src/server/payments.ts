/**
 * Pasarela de pago. Hoy solo existe la de demostración (sin dinero real). Cuando lleguen las llaves de Bold,
 * se agrega aquí el proveedor "bold": crea el enlace de pago y un webhook llama a completeOrder() al aprobarse.
 */
export type ProviderName = "demo";

export function paymentProvider(): ProviderName {
  return "demo";
}

export function checkoutPathFor(orderId: string): string {
  return `/pago/demo/${orderId}`;
}
