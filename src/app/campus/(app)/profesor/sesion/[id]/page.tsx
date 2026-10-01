import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RescheduleForm } from "@/components/campus/RescheduleForm";
import { canTeach, getCurrentProfile } from "@/lib/campus/auth";
import { formatDay, formatRange, toLocalInput } from "@/lib/campus/time";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cambiar horario" };

interface Row {
  id: string;
  cohort_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  online_url: string | null;
  status: "scheduled" | "cancelled";
  cohorts: { name: string; sede: string; teacher_id: string | null } | null;
}

export default async function CambiarHorario(props: PageProps<"/campus/profesor/sesion/[id]">) {
  const profile = await getCurrentProfile();
  if (!profile || !canTeach(profile)) redirect("/campus");
  const { id } = await props.params;

  const supabase = await createClient();
  const { data: s } = await supabase
    .from("sessions")
    .select("id, cohort_id, title, starts_at, ends_at, location, online_url, status, cohorts(name, sede, teacher_id)")
    .eq("id", id)
    .maybeSingle<Row>();
  if (!s || (profile.role === "teacher" && s.cohorts?.teacher_id !== profile.id)) notFound();

  const { count } = await supabase
    .from("enrollments")
    .select("student_id", { count: "exact", head: true })
    .eq("cohort_id", s.cohort_id)
    .eq("status", "active");

  return (
    <div className="max-w-2xl">
      <p className="mb-4"><Link href="/campus/profesor" className="underline">← Volver a mis clases</Link></p>
      <h1 className="mb-2 text-3xl font-bold">Cambiar horario</h1>
      <p className="mb-1 text-xl font-medium">{s.title}</p>
      <p className="mb-8 text-muted">
        Ahora: {formatDay(s.starts_at)}, {formatRange(s.starts_at, s.ends_at)}
        {s.cohorts ? ` · ${s.cohorts.name} (${s.cohorts.sede})` : ""}
      </p>

      <RescheduleForm
        sessionId={s.id}
        title={s.title}
        startsAt={toLocalInput(s.starts_at)}
        endsAt={toLocalInput(s.ends_at)}
        location={s.location ?? ""}
        onlineUrl={s.online_url ?? ""}
        cancelled={s.status === "cancelled"}
        studentCount={count ?? 0}
      />
    </div>
  );
}
