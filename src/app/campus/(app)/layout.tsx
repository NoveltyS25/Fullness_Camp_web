import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unreadCount } from "@/server/campus";
import { getDb } from "@/server/db";
import { isPendingCedula } from "@/server/users";
import { getViews, VIEW_HOME, VIEW_LABEL, type View } from "@/server/web";
import { logoutAction, switchViewAction } from "../actions";

export const metadata: Metadata = {
  title: { default: "Campus virtual", template: "%s | Campus Fullness Camp" },
  robots: { index: false, follow: false },
};

const pill = "inline-flex min-h-12 items-center rounded-full px-4 font-medium text-ink hover:bg-clay-soft";

const NAV: Record<View, { href: string; label: string }[]> = {
  student: [
    { href: "/campus", label: "Mi horario" },
    { href: "/campus/avance", label: "Mi avance" },
    { href: "/campus/cursos", label: "Mis cursos" },
  ],
  teacher: [
    { href: "/campus/profesor", label: "Mis clases" },
    { href: "/campus/profesor/estudiantes", label: "Mis estudiantes" },
  ],
  admin: [
    { href: "/campus/admin", label: "Panel" },
    { href: "/campus/admin/certificaciones", label: "Certificaciones" },
    { href: "/campus/admin/clases", label: "Clases y docentes" },
    { href: "/campus/admin/interesadas", label: "Interesadas" },
    { href: "/campus/admin/quejas", label: "Quejas" },
  ],
};

export default async function CampusLayout({ children }: LayoutProps<"/campus">) {
  const views = await getViews();
  if (!views) redirect("/campus/ingresar");
  const { user, available, current } = views;
  if (user.must_change_password) redirect("/campus/cambiar-clave");
  // Docente que aún no completó su registro: primero sus datos.
  if (user.role !== "student" && isPendingCedula(user.cedula)) redirect("/campus/bienvenida-docente");

  const unread = await unreadCount(getDb(), user.id);

  return (
    <>
      <header className="border-b border-clay-soft bg-sand">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link href={VIEW_HOME[current]} className="flex items-center gap-3" aria-label="Campus Fullness Camp, ir al inicio de tu panel">
            <Image src="/brand/logo.png" alt="" width={48} height={45} />
            <span className="font-serif text-xl font-bold text-clay-dark">
              Campus<span className="block text-sm font-normal text-muted">{VIEW_LABEL[current]}</span>
            </span>
          </Link>
          <nav aria-label="Campus" className="flex flex-wrap items-center gap-1">
            {NAV[current].map((n) => <Link key={n.href} href={n.href} className={pill}>{n.label}</Link>)}
            <Link href="/campus/avisos" className={pill}>
              Avisos
              {unread > 0 && <span className="ml-2 grid h-7 min-w-7 place-items-center rounded-full bg-clay-dark px-1.5 text-sm text-white">{unread}</span>}
            </Link>
            <Link href="/campus/perfil" className={pill}>Mi perfil</Link>
            <form action={logoutAction}><button type="submit" className={`${pill} underline`}>Salir</button></form>
          </nav>
        </div>
        {available.length > 1 && (
          <div className="border-t border-clay-soft bg-white/60">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-5 py-2">
              <span className="text-muted">Ver como:</span>
              {available.map((v) => (
                <form key={v} action={switchViewAction}>
                  <input type="hidden" name="view" value={v} />
                  <button
                    type="submit"
                    aria-current={v === current ? "true" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 font-medium ${v === current ? "border-clay-dark bg-clay-dark text-white" : "border-clay-dark text-clay-dark hover:bg-clay-soft"}`}
                  >
                    {VIEW_LABEL[v]}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">{children}</div>
    </>
  );
}
