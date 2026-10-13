import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getEntitlements, unreadCount } from "@/server/campus";
import { isPendingCedula } from "@/server/users";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import { logoutAction, switchViewAction } from "../actions";

export const metadata: Metadata = {
  title: { default: "Campus virtual", template: "%s | Campus Fullness Camp" },
  robots: { index: false, follow: false },
};

const pill = "inline-flex min-h-12 items-center rounded-full px-4 font-medium text-ink hover:bg-clay-soft";

export default async function CampusLayout({ children }: LayoutProps<"/campus">) {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  if (user.must_change_password) redirect("/campus/cambiar-clave");

  // Docente que aún no completó su registro: primero sus datos.
  if (user.role !== "student" && isPendingCedula(user.cedula)) redirect("/campus/bienvenida-docente");

  const db = getDb();
  const unread = await unreadCount(db, user.id);
  const hasStaffRole = user.role === "teacher" || user.role === "admin";
  // Una docente con inscripción propia puede ver el campus como estudiante, con la misma cédula.
  const studentView = hasStaffRole && (await cookies()).get("fc_view")?.value === "student";
  const isStaff = hasStaffRole && !studentView;
  const canSwitchToStudent = isStaff && (await getEntitlements(db, user.id)).length > 0;

  return (
    <>
      <header className="border-b border-clay-soft bg-sand">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link href="/campus" className="flex items-center gap-3" aria-label="Campus Fullness Camp, ir al inicio del campus">
            <Image src="/brand/logo.png" alt="" width={48} height={45} />
            <span className="font-serif text-xl font-bold text-clay-dark">Campus</span>
          </Link>
          <nav aria-label="Campus" className="flex flex-wrap items-center gap-1">
            <Link href="/campus" className={pill}>Mi horario</Link>
            {!isStaff && <Link href="/campus/cursos" className={pill}>Mis cursos</Link>}
            {isStaff && <Link href="/campus/profesor" className={pill}>Mis clases</Link>}
            {user.role === "admin" && <Link href="/campus/admin" className={pill}>Administración</Link>}
            <Link href="/campus/avisos" className={pill}>
              Avisos
              {unread > 0 && <span className="ml-2 grid h-7 min-w-7 place-items-center rounded-full bg-clay-dark px-1.5 text-sm text-white">{unread}</span>}
            </Link>
            <Link href="/campus/perfil" className={pill}>Mi perfil</Link>
            {(canSwitchToStudent || studentView) && (
              <form action={switchViewAction}>
                <input type="hidden" name="view" value={studentView ? "staff" : "student"} />
                <button type="submit" className="inline-flex min-h-12 items-center rounded-full border-2 border-clay-dark px-4 font-medium text-clay-dark hover:bg-clay-soft">
                  {studentView ? "Volver a mi panel de docente" : "Ir a mi panel de estudiante"}
                </button>
              </form>
            )}
            <form action={logoutAction}><button type="submit" className={`${pill} underline`}>Salir</button></form>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">{children}</div>
    </>
  );
}
