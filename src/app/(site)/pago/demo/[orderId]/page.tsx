import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { formatCOP } from "@/lib/pricing";
import { getDb } from "@/server/db";
import { getOrder, getOrderItems } from "@/server/orders";
import { isDemoMode } from "@/server/web";
import { approveDemoPayment, rejectDemoPayment } from "../../actions";

export const metadata: Metadata = {
  title: "Pago (demostración)",
  robots: { index: false, follow: false },
};

export default async function PagoDemo(props: PageProps<"/pago/demo/[orderId]">) {
  if (!isDemoMode()) notFound();
  const { orderId } = await props.params;
  const db = getDb();
  const order = await getOrder(db, orderId);
  if (!order) notFound();
  if (order.status === "paid") redirect(`/pago/exito/${orderId}`);
  const items = await getOrderItems(db, orderId);

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <p className="mb-6 rounded-2xl bg-ink px-4 py-3 text-center font-medium text-white">
        MODO DEMOSTRACIÓN · No se cobra dinero ni se piden datos de tarjeta
      </p>

      <div className="rounded-3xl border border-clay-soft bg-white p-8">
        <h1 className="mb-1 text-2xl font-bold">Pago seguro con tarjeta</h1>
        <p className="mb-6 text-muted">Aquí aparecerá la pasarela de pago real (Bold). Para la demostración, tú decides el resultado.</p>

        <ul className="mb-4 space-y-2">
          {items.map((i) => (
            <li key={i.program_slug} className="flex justify-between gap-3"><span>{i.title}</span><span className="shrink-0 font-medium">{formatCOP(i.total)}</span></li>
          ))}
        </ul>
        <p className="mb-8 flex justify-between border-t border-clay-soft pt-4 text-2xl font-bold text-clay-dark"><span>Total</span><span>{formatCOP(order.total)}</span></p>

        <div className="space-y-3">
          <form action={approveDemoPayment}>
            <input type="hidden" name="order_id" value={order.id} />
            <button type="submit" className="btn btn-primary w-full">Simular pago aprobado</button>
          </form>
          <form action={rejectDemoPayment}>
            <input type="hidden" name="order_id" value={order.id} />
            <button type="submit" className="btn btn-secondary w-full">Simular pago rechazado</button>
          </form>
        </div>
      </div>
    </main>
  );
}
