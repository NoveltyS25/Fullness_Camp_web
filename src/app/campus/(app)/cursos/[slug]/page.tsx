import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProgram } from "@/data/programs";
import { formatDay, formatRange } from "@/lib/campus/time";
import { getEntitlements } from "@/server/campus";
import { getPensum, getProgramTeachers, MODALITIES } from "@/server/classes";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Plan de estudios" };

export default async function PlanDeEstudios(props: PageProps<"/campus/cursos/[slug]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  const { slug } = await props.params;
  const program = getProgram(slug);
  if (!program) notFound();

  const db = getDb();
  // Solo ve el plan de estudios quien tiene ese curso (inscripción activa) o es parte del equipo.
  if (user.role === "student") {
    const mine = await getEntitlements(db, user.id);
    if (!mine.some((e) => e.program_slug === slug)) redirect("/campus/cursos");
  }

  const [modules, teachers] = await Promise.all([getPensum(db, slug), getProgramTeachers(db, slug)]);
  const isAdmin = user.role === "admin";

  return (
    <div className="space-y-12">
      <div>
        <p className="mb-4"><Link href={isAdmin ? `/campus/admin/certificaciones/${slug}` : "/campus/cursos"} className="underline">{isAdmin ? "← Editar esta certificación" : "← Mis cursos"}</Link></p>
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">{program.title}</h1>
        <p className="text-lg text-muted">Plan de estudios: módulos y clases, con la docente, la modalidad y el próximo horario de cada una.</p>
      </div>

      {modules.length === 0 ? (
        <p className="rounded-3xl border border-clay-soft bg-white p-8 text-center text-xl">El plan de estudios de este curso se está preparando.</p>
      ) : (
        <div className="space-y-8">
          {modules.map((m, mi) => (
            <section key={m.id} aria-labelledby={`m-${m.id}`} className="rounded-3xl border border-clay-soft bg-white p-5 sm:p-6">
              <h2 id={`m-${m.id}`} className="mb-4 text-2xl font-bold text-clay-dark">Módulo {mi + 1}. {m.title}</h2>
              {m.classes.length === 0 ? (
                <p className="text-muted">Aún no hay clases en este módulo.</p>
              ) : (
                <ul className="divide-y divide-clay-soft">
                  {m.classes.map((c) => (
                    <li key={c.placement_id} className="py-3">
                      <p className="text-lg font-medium">{c.title}</p>
                      <p className="text-muted">
                        {c.teacher_name ?? "Docente por asignar"} · {MODALITIES[c.modality]}
                      </p>
                      {c.next_start && c.next_end ? (
                        <p className="text-muted">
                          Próxima clase: {formatDay(c.next_start)}, {formatRange(c.next_start, c.next_end)}
                          {c.upcoming_count > 1 ? ` · ${c.upcoming_count} clases programadas` : ""}
                        </p>
                      ) : (
                        <p className="text-muted">Horario por definir</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <section aria-labelledby="otros" className="grid gap-4 sm:grid-cols-2">
        <h2 id="otros" className="sr-only">Tesina y retiros</h2>
        <div className="rounded-3xl bg-clay-soft p-5">
          <h3 className="mb-2 text-xl font-bold">Tesina</h3>
          <p className="text-lg">La tesina es obligatoria para graduarte. La presentas directamente a Lila Govardhan.</p>
        </div>
        <div className="rounded-3xl bg-clay-soft p-5">
          <h3 className="mb-2 text-xl font-bold">Retiros</h3>
          <p className="text-lg">Los retiros no están incluidos en el valor del programa. Como estudiante activa tienes un precio especial; las personas externas pagan otro valor.</p>
        </div>
      </section>

      <section aria-labelledby="docentes">
        <h2 id="docentes" className="mb-4 text-2xl font-bold">Docentes de esta certificación</h2>
        {teachers.length === 0 ? (
          <p className="rounded-3xl border border-clay-soft bg-white p-6 text-lg">Las docentes aparecerán aquí cuando se asignen a las clases.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {teachers.map((t) => (
              <li key={t.user_id} className="rounded-3xl border border-clay-soft bg-white p-5">
                <div className="flex gap-4">
                  {t.photo_url && <Image src={t.photo_url} alt="" width={80} height={80} unoptimized className="h-20 w-20 shrink-0 rounded-full object-cover" />}
                  <div>
                    <h3 className="text-xl font-bold text-clay-dark">{t.full_name}</h3>
                    {t.headline && <p className="text-muted">{t.headline}</p>}
                  </div>
                </div>
                {t.bio && <p className="mt-3">{t.bio}</p>}
                <p className="mt-3 text-sm text-muted">Dicta: {t.classes.join(" · ")}</p>
                {(t.contact_email || t.contact_phone) ? (
                  <p className="mt-3 text-lg">
                    {t.contact_email && <a href={`mailto:${t.contact_email}`} className="block break-all font-medium text-clay-dark underline">{t.contact_email}</a>}
                    {t.contact_phone && <a href={`https://wa.me/${t.contact_phone}`} target="_blank" rel="noopener noreferrer" className="block font-medium text-clay-dark underline">WhatsApp {t.contact_phone}</a>}
                  </p>
                ) : (
                  <p className="mt-3 text-muted">Contacto: la docente lo agregará pronto.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
