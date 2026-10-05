import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RescheduleForm } from "@/components/campus/RescheduleForm";
import { formatDay, formatRange, toLocalInput } from "@/lib/campus/time";
import { countActiveEnrollees, getSessionForActor } from "@/server/campus";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Cambiar horario" };

export default async function CambiarHorario(props: PageProps<"/campus/profesor/sesion/[id]">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) redirect("/campus");
  const { id } = await props.params;

  const db = getDb();
  const s = await getSessionForActor(db, user, id);
  if (!s) notFound();
  const count = await countActiveEnrollees(db, s.cohort_id);

  return (
    <div className="max-w-2xl">
      <p className="mb-4"><Link href="/campus/profesor" className="underline">← Volver a mis clases</Link></p>
      <h1 className="mb-2 text-3xl font-bold">Cambiar horario</h1>
      <p className="mb-1 text-xl font-medium">{s.title}</p>
      <p className="mb-8 text-muted">Ahora: {formatDay(s.starts_at)}, {formatRange(s.starts_at, s.ends_at)} · {s.cohort_name} ({s.sede})</p>

      <RescheduleForm
        sessionId={s.id}
        title={s.title}
        startsAt={toLocalInput(s.starts_at)}
        endsAt={toLocalInput(s.ends_at)}
        location={s.location ?? ""}
        onlineUrl={s.online_url ?? ""}
        cancelled={s.status === "cancelled"}
        studentCount={count}
      />
    </div>
  );
}
