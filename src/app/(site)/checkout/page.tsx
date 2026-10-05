import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export default function Checkout() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="mb-4"><Link href="/carrito" className="underline">← Volver al carrito</Link></p>
      <h1 className="mb-8 text-4xl font-bold">Finalizar compra</h1>
      <CheckoutForm />
    </main>
  );
}
