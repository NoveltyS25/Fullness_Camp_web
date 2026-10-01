const ADVISOR = process.env.NEXT_PUBLIC_WHATSAPP_ADVISOR ?? "573116741900";

export function whatsappLink(message: string): string {
  return `https://wa.me/${ADVISOR}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_GENERAL = whatsappLink(
  "Hola, quisiera información sobre las certificaciones de yoga de Fullness Camp.",
);
