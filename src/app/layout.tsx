import type { Metadata } from "next";
import localFont from "next/font/local";
import { AttributionCapture } from "@/components/AttributionCapture";
import { CartProvider } from "@/lib/cart";
import "./globals.css";

// Fuentes alojadas en el propio sitio (más rápido, sin pedirle nada a Google en cada visita).
const roboto = localFont({
  src: "./fonts/Roboto-latin.woff2",
  variable: "--font-roboto",
  weight: "400 700",
  display: "swap",
});

const robotoSlab = localFont({
  src: "./fonts/RobotoSlab-latin.woff2",
  variable: "--font-roboto-slab",
  weight: "400 700",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fullnesscampinternacional.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Fullness Camp | Escuela de formación para instructores de yoga",
    template: "%s | Fullness Camp",
  },
  description:
    "Escuela de formación de instructores de yoga en Colombia con certificación Yoga Alliance. Sedes en Bogotá, Cajicá y Tabio.",
  robots:
    process.env.MAINTENANCE_MODE === "true"
      ? { index: false, follow: false }
      : { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${roboto.variable} ${robotoSlab.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col"><CartProvider>
          <AttributionCapture />
          {children}
        </CartProvider></body>
    </html>
  );
}
