import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, inputClass } from "@/components/campus/ActionForm";
import { programs } from "@/data/programs";
import { getCurrentProfile } from "@/lib/campus/auth";
import { createClient } from "@/lib/supabase/server";
import { createCohort, setRole } from "./actions";

export const metadata = { title: "Administración" };

interface CohortRow {
  id: string;
  name: string;
  sede: string;
  program_slug: string;
  active: boolean;
  profiles: { full_name: string; email: string | null } | null;
}
interface StaffRow {
  id: string;
  role: "teacher" | "admin";
  full_name: string;
  email: string | null;
}

const roleLabel = { teacher: "Profesora", admin: "Administradora" } as const;

export default async function Admin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/campus");

  const supabase = await createClient();
  const [{ data: cohorts }, { data: staff }] = await Promise.all([
    supabase
      .from("cohorts")
      .select("id, name, sede, program_slug, active, profiles:teacher_id(full_name, email)")
      .order("created_at", { ascending: false })
      .returns<CohortRow[]>(),
    supabase.from("profiles").select("id, role, full_name, email").in("role", ["teacher", "admin"]).order("full_name").returns<StaffRow[]>(),
  ]);
  const teachers = (staff ?? []).filter((s) => s.role === "teacher" || s.role === "admin");

  return (
    <div className="space-y-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Administración</h1>

      <section aria-labelledby="cohortes">
        <h2 id="cohortes" className="mb-4 text-2xl font-bold">Cohortes</h2>
        {(cohorts ?? []).length === 0 ? (
          <p className="rounded-3xl border border-clay-soft bg-white p-6 text-lg">Aún no hay cohortes. Crea la primera abajo.</p>
        ) : (
          <ul className="space-y-3">
            {(cohorts ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/campus/admin/cohortes/${c.id}`} className={`block rounded-3xl border p-5 no-underline hover:border-clay-dark ${c.active ? "border-clay-soft bg-white" : "border-dashed border-clay-soft bg-sand opacity-80"}`}>
                  <span className="text-xl font-bold text-clay-dark">{c.name}</span>
                  {!c.active && <span className="ml-3 rounded-full bg-ink px-3 py-1 text-sm text-white">Inactiva</span>}
                  <span className="block text-muted">
                    {c.sede} · {programs.find((p) => p.slug === c.program_slug)?.title ?? c.program_slug}
                  </span>
                  <span className="block text-muted">Profesora: {c.profiles?.full_name || c.profiles?.email || "sin asignar"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="nueva" className="max-w-2xl">
        <h2 id="nueva" className="mb-4 text-2xl font-bold">Crear una cohorte</h2>
        <ActionForm action={createCohort} submitLabel="Crear cohorte">
          <div>
            <label htmlFor="program_slug" className="mb-2 block text-lg font-medium">Programa</label>
            <select id="program_slug" name="program_slug" required className={inputClass} defaultValue="">
              <option value="" disabled>Elige un programa</option>
              {programs.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="name" className="mb-2 block text-lg font-medium">Nombre de la cohorte</label>
            <input id="name" name="name" required maxLength={120} placeholder="Hatha Vinyasa 300h - Bogotá 2026" className={inputClass} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="sede" className="mb-2 block text-lg font-medium">Sede</label>
              <select id="sede" name="sede" required className={inputClass} defaultValue="">
                <option value="" disabled>Elige una sede</option>
                {["Bogotá", "Cajicá", "Tabío", "Online"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="starts_on" className="mb-2 block text-lg font-medium">Inicia (opcional)</label>
              <input id="starts_on" name="starts_on" type="date" className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="teacher_id" className="mb-2 block text-lg font-medium">Profesora</label>
            <select id="teacher_id" name="teacher_id" className={inputClass} defaultValue="">
              <option value="">Sin asignar por ahora</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}
            </select>
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="personas" className="max-w-2xl">
        <h2 id="personas" className="mb-4 text-2xl font-bold">Profesoras y administradoras</h2>
        <ul className="mb-6 space-y-2">
          {teachers.map((t) => (
            <li key={t.id} className="rounded-2xl border border-clay-soft bg-white p-4 text-lg">
              <strong>{t.full_name || "Sin nombre"}</strong> · {t.email} · <span className="text-muted">{roleLabel[t.role]}</span>
            </li>
          ))}
        </ul>
        <p className="mb-4 text-muted">Para dar un rol, la persona debe haber entrado antes al campus con su correo.</p>
        <ActionForm action={setRole} submitLabel="Guardar rol">
          <div>
            <label htmlFor="email" className="mb-2 block text-lg font-medium">Correo de la persona</label>
            <input id="email" name="email" type="email" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="role" className="mb-2 block text-lg font-medium">Rol</label>
            <select id="role" name="role" required className={inputClass} defaultValue="teacher">
              <option value="teacher">Profesora</option>
              <option value="admin">Administradora</option>
              <option value="student">Estudiante (quitar permisos)</option>
            </select>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
