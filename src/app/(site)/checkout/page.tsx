import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/CheckoutForm";
import { programs } from "@/data/programs";
import { startsWithinRetractWindow } from "@/server/acceptance";
import { getDb } from "@/server/db";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Checkout() {
  const db = getDb();
  const early: string[] = [];
  for (const p of programs) if (await startsWithinRetractWindow(db, [p.slug])) early.push(p.slug);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="mb-4"><Link href="/carrito" className="underline">← Volver al carrito</Link></p>
      <h1 className="mb-8 text-4xl font-bold">Finalizar compra</h1>
      <CheckoutForm earlyStartSlugs={early} />
    </main>
  );
}
