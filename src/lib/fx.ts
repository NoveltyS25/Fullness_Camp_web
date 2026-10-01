/**
 * Pago en dólares = equivalente del valor en pesos (COP) a una tasa de cambio.
 * La tasa se define en USD_COP_RATE (pesos por 1 USD). Sin tasa configurada, el pago en USD
 * queda desactivado: nunca se cobra con una tasa inventada.
 */
export function getUsdCopRate(): number | null {
  const rate = Number(process.env.USD_COP_RATE);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/** Convierte COP a USD con centavos, redondeando al centavo más cercano. */
export function copToUsd(cop: number, rate: number): number {
  return Math.round((cop / rate) * 100) / 100;
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
