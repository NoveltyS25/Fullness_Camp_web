/**
 * Normaliza un número de WhatsApp al formato internacional sin "+".
 * - "311 674 1900" (10 dígitos, celular colombiano que empieza por 3) -> "573116741900"
 * - "+57 311 674 1900" -> "573116741900"
 * - Otros países: se acepta si ya traen el indicativo (10 a 15 dígitos).
 * Devuelve null si no es válido.
 */
export function normalizeWhatsapp(input: string): string | null {
  let digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("3")) digits = `57${digits}`;
  return /^\d{10,15}$/.test(digits) ? digits : null;
}
