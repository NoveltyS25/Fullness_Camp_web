import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCartOnMount } from "@/components/ClearCartOnMount";
import { ScrollTop } from "@/components/ScrollTop";
import { formatCOP } from "@/lib/pricing";
import { getDb } from "@/server/db";
import { getOrder, getOrderItems } from "@/server/orders";
import { isDemoMode } from "@/server/web";

export const metadata: Metadata = {
  title: "Pago recibido",
  robots: { index: false, follow: false },
};

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

export default async function PagoExito(props: PageProps<"/pago/exito/[orderId]">) {
  const { orderId } = await props.params;
  const db = getDb();
  const order = await getOrder(db, orderId);
  if (!order) notFound();

  // Pago aún no confirmado (con la pasarela real puede tardar unos segundos): la página se actualiza sola.
  if (order.status === "pending") {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center">
        <meta httpEquiv="refresh" content="4" />
        <h1 className="mb-4 text-3xl font-bold">Estamos confirmando tu pago…</h1>
        <p className="text-lg text-muted">Esta página se actualiza sola. No la cierres.</p>
      </main>
    );
  }
  if (order.status !== "paid") {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="mb-4 text-3xl font-bold">No pudimos confirmar tu pago</h1>
        <p className="mb-8 text-lg text-muted">No se hizo ningún cobro. Puedes intentarlo de nuevo.</p>
        <Link href="/carrito" className="btn btn-primary">Volver al carrito</Link>
      </main>
    );
  }

  const items = await getOrderItems(db, orderId);

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <ScrollTop />
      <ClearCartOnMount orderId={order.id} total={order.total} items={items.map((i) => ({ slug: i.program_slug, title: i.title, price: i.total }))} />
      <div className="mb-8 text-center">
        <p className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-clay-dark text-3xl text-white" aria-hidden="true">✓</p>
        <h1 className="mb-2 text-4xl font-bold">¡Pago recibido!</h1>
        <p className="text-xl">Gracias, {order.buyer_name.split(" ")[0]}. Tu inscripción quedó confirmada.</p>
      </div>

      <section aria-labelledby="resumen" className="mb-8 rounded-3xl border border-clay-soft bg-white p-6">
        <h2 id="resumen" className="mb-3 text-xl font-bold">Tu compra</h2>
        <ul className="space-y-2">
          {items.map((i) => <li key={i.program_slug} className="flex justify-between gap-3"><span>{i.title}</span><span className="shrink-0 font-medium">{formatCOP(i.total)}</span></li>)}
        </ul>
        <p className="mt-3 flex justify-between border-t border-clay-soft pt-3 text-lg font-bold"><span>Total pagado</span><span>{formatCOP(order.total)}</span></p>
        <p className="mt-1 text-sm text-muted">Referencia: {order.id.slice(0, 8).toUpperCase()}</p>
      </section>

      <section aria-labelledby="pasos" className="rounded-3xl bg-clay-soft p-6">
        <h2 id="pasos" className="mb-4 text-2xl font-bold">Ahora, entra a tu campus virtual</h2>
        <ol className="space-y-4 text-lg">
          <li className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay-dark font-bold text-white">1</span><span><strong>Revisa tu correo</strong> ({maskEmail(order.buyer_email)}). Te enviamos el paso a paso y un enlace para crear tu contraseña. Si no lo ves, mira en spam.</span></li>
          <li className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay-dark font-bold text-white">2</span><span><strong>Crea tu contraseña</strong> con el enlace del correo.</span></li>
          <li className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay-dark font-bold text-white">3</span><span><strong>Entra con tu cédula</strong> y la contraseña que creaste, en «Campus virtual».</span></li>
        </ol>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/campus/ingresar" className="btn btn-primary">Ir al campus virtual</Link>
          {isDemoMode() && <Link href="/demo/bandeja" className="btn btn-secondary">Ver el correo enviado (demo)</Link>}
        </div>
      </section>
    </main>
  );
}
