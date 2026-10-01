import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = {
  title: "Tu carrito",
  robots: { index: false, follow: true },
};

export default function Carrito() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="mb-8 text-4xl font-bold">Tu carrito</h1>
      <CartView />
    </main>
  );
}
