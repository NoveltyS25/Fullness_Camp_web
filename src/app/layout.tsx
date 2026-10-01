import type { Metadata } from "next";
import { Roboto, Roboto_Slab } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
  weight: ["400", "700"],
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
