import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/server/db";
import { isDemoMode } from "@/server/web";

export const metadata: Metadata = {
  title: "Bandeja de demostración",
  robots: { index: false, follow: false },
};

// Siempre fresca: muestra lo último que "envió" el sistema.
export const dynamic = "force-dynamic";

interface Msg {
  id: string;
  channel: "email" | "whatsapp";
  to_address: string;
  subject: string | null;
  body_text: string;
  body_html: string | null;
  status: "sent" | "logged" | "failed";
  error: string | null;
  created_at: string;
}

const when = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "medium" });

export default async function Bandeja() {
  if (!isDemoMode()) notFound();
  const messages = await getDb().all<Msg>("SELECT id, channel, to_address, subject, body_text, body_html, status, error, created_at FROM outbox ORDER BY created_at DESC LIMIT 30");

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="mb-2 text-3xl font-bold">Bandeja de demostración</h1>
      <p className="mb-8 text-lg text-muted">
        Aquí se ven los correos y WhatsApp que el sistema habría enviado. En producción salen de verdad por Resend y WhatsApp; en la demostración solo se registran. Recarga la página para ver los más recientes.
      </p>

      {messages.length === 0 ? (
        <p className="rounded-3xl border border-clay-soft bg-white p-8 text-center text-xl">Todavía no se ha enviado nada.</p>
      ) : (
        <ul className="space-y-6">
          {messages.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-3xl border border-clay-soft bg-white">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-clay-soft px-5 py-3">
                <span className="rounded-full bg-clay-dark px-3 py-1 text-sm font-medium text-white">{m.channel === "email" ? "Correo" : "WhatsApp"}</span>
                <span className="font-medium">Para: {m.to_address}</span>
                <span className="text-sm text-muted">{when.format(new Date(m.created_at))}</span>
                {m.status === "failed" && <span className="text-sm font-medium text-red-800">Falló: {m.error}</span>}
              </div>
              <div className="p-5">
                {m.subject && <p className="mb-3 text-xl font-bold">{m.subject}</p>}
                {m.body_html ? (
                  <iframe title={m.subject ?? "Mensaje"} sandbox="" srcDoc={m.body_html} className="h-[46rem] w-full rounded-xl border border-clay-soft bg-white" />
                ) : (
                  <p className="whitespace-pre-wrap rounded-2xl bg-sand p-4 text-lg">{m.body_text}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
