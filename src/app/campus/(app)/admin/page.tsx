import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, inputClass } from "@/components/campus/ActionForm";
import { programs } from "@/data/programs";
import { listCohorts, listStaff } from "@/server/campus";
import { countOpenComplaints } from "@/server/complaints";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import { createCohortAction, createStaffAction, setCanGradeAction, setRoleAction } from "./actions";

export const metadata = { title: "Administración" };

const roleLabel = { teacher: "Profesora", admin: "Administradora", student: "Estudiante" } as const;

export default async function Admin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/campus");

  const db = getDb();
  const [cohorts, staff, openComplaints] = await Promise.all([listCohorts(db), listStaff(db), countOpenComplaints(db)]);

  return (
    <div className="space-y-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">Administración</h1>
        {openComplaints > 0 && (
          <Link href="/campus/admin/quejas" className="btn btn-primary">{openComplaints} {openComplaints === 1 ? "queja por revisar" : "quejas por revisar"}</Link>
        )}
      </div>

      <section aria-labelledby="cohortes">
        <h2 id="cohortes" className="mb-4 text-2xl font-bold">Cohortes</h2>
        {cohorts.length === 0 ? (
          <p className="rounded-3xl border border-clay-soft bg-white p-6 text-lg">Aún no hay cohortes. Crea la primera abajo.</p>
        ) : (
          <ul className="space-y-3">
            {cohorts.map((c) => (
              <li key={c.id}>
                <Link href={`/campus/admin/cohortes/${c.id}`} className={`block rounded-3xl border p-5 no-underline hover:border-clay-dark ${c.active ? "border-clay-soft bg-white" : "border-dashed border-clay-soft bg-sand opacity-80"}`}>
                  <span className="text-xl font-bold text-clay-dark">{c.name}</span>
                  {!c.active && <span className="ml-3 rounded-full bg-ink px-3 py-1 text-sm text-white">Inactiva</span>}
                  <span className="block text-muted">{c.sede} · {programs.find((p) => p.slug === c.program_slug)?.title ?? c.program_slug}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="nueva" className="max-w-2xl">
        <h2 id="nueva" className="mb-4 text-2xl font-bold">Crear una cohorte</h2>
        <ActionForm action={createCohortAction} submitLabel="Crear cohorte">
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
        </ActionForm>
      </section>

      <section aria-labelledby="personas" className="max-w-2xl space-y-8">
        <h2 id="personas" className="text-2xl font-bold">Profesoras y administradoras</h2>
        <ul className="space-y-2">
          {staff.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clay-soft bg-white p-4 text-lg">
              <span>
                <strong>{t.full_name}</strong> · {t.cedula.startsWith("PEND-") ? "aún sin cédula (no ha completado su registro)" : `cédula ${t.cedula}`} · <span className="text-muted">{roleLabel[t.role]}</span>
                {!t.can_grade && <span className="ml-2 rounded-full bg-clay-soft px-3 py-1 text-sm">Suplente: no aprueba estudiantes</span>}
              </span>
              <form action={setCanGradeAction}>
                <input type="hidden" name="user_id" value={t.id} />
                <input type="hidden" name="can_grade" value={t.can_grade ? "false" : "true"} />
                <button type="submit" className="min-h-12 rounded-full px-4 font-medium text-clay-dark underline hover:bg-clay-soft">
                  {t.can_grade ? "Hacerla suplente (no aprueba)" : "Permitirle aprobar estudiantes"}
                </button>
              </form>
            </li>
          ))}
        </ul>

        <div>
          <h3 className="mb-3 text-xl font-bold">Crear la cuenta de una profesora</h3>
          <p className="mb-4 text-muted">Le llegará por correo el enlace para crear su contraseña. En su primer ingreso completa sus datos de contacto.</p>
          <ActionForm action={createStaffAction} submitLabel="Crear cuenta">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="s_full_name" className="mb-2 block text-lg font-medium">Nombre completo</label>
                <input id="s_full_name" name="full_name" required className={inputClass} />
              </div>
              <div>
                <label htmlFor="s_cedula" className="mb-2 block text-lg font-medium">Cédula <span className="font-normal text-muted">(vacía para docentes: la escriben al entrar)</span></label>
                <input id="s_cedula" name="cedula" inputMode="numeric" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="s_email" className="mb-2 block text-lg font-medium">Correo</label>
                <input id="s_email" name="email" type="email" required className={inputClass} />
              </div>
              <div>
                <label htmlFor="s_role" className="mb-2 block text-lg font-medium">Rol</label>
                <select id="s_role" name="role" className={inputClass} defaultValue="teacher">
                  <option value="teacher">Profesora</option>
                  <option value="admin">Administradora</option>
                </select>
              </div>
            </div>
          </ActionForm>
        </div>

        <div>
          <h3 className="mb-3 text-xl font-bold">Cambiar el rol de una cuenta existente</h3>
          <ActionForm action={setRoleAction} submitLabel="Guardar rol">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="r_cedula" className="mb-2 block text-lg font-medium">Cédula</label>
                <input id="r_cedula" name="cedula" inputMode="numeric" required className={inputClass} />
              </div>
              <div>
                <label htmlFor="r_role" className="mb-2 block text-lg font-medium">Rol</label>
                <select id="r_role" name="role" className={inputClass} defaultValue="teacher">
                  <option value="teacher">Profesora</option>
                  <option value="admin">Administradora</option>
                  <option value="student">Estudiante (quitar permisos)</option>
                </select>
              </div>
            </div>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
