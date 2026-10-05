import { redirect } from "next/navigation";
import { getNotifications } from "@/server/campus";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import { markAllReadAction } from "../../actions";

export const metadata = { title: "Avisos" };

const when = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" });

export default async function Avisos() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  const notices = await getNotifications(getDb(), user.id);
  const unread = notices.some((n) => !n.read_at);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">Avisos</h1>
        {unread && <form action={markAllReadAction}><button type="submit" className="btn btn-secondary">Marcar todo como leído</button></form>}
      </div>

      {notices.length === 0 ? (
        <p className="rounded-3xl border border-clay-soft bg-white p-8 text-center text-xl">No tienes avisos.</p>
      ) : (
        <ul className="space-y-3">
          {notices.map((n) => (
            <li key={n.id} className={`rounded-3xl border p-5 ${n.read_at ? "border-clay-soft bg-white" : "border-clay-dark bg-clay-soft"}`}>
              <p className="text-sm text-muted">{when.format(new Date(n.created_at))}{!n.read_at && " · Nuevo"}</p>
              <h2 className="text-xl font-bold">{n.title}</h2>
              <p className="mt-1 text-lg">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
