import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unreadCount } from "@/server/campus";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";
import { logoutAction } from "../actions";

export const metadata: Metadata = {
  title: { default: "Campus virtual", template: "%s | Campus Fullness Camp" },
  robots: { index: false, follow: false },
};

const pill = "inline-flex min-h-12 items-center rounded-full px-4 font-medium text-ink hover:bg-clay-soft";

export default async function CampusLayout({ children }: LayoutProps<"/campus">) {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  if (user.must_change_password) redirect("/campus/cambiar-clave");

  const unread = await unreadCount(getDb(), user.id);
  const isStaff = user.role === "teacher" || user.role === "admin";

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
            {isStaff && <Link href="/campus/profesor" className={pill}>Mis clases</Link>}
            {user.role === "admin" && <Link href="/campus/admin" className={pill}>Administración</Link>}
            <Link href="/campus/avisos" className={pill}>
              Avisos
              {unread > 0 && <span className="ml-2 grid h-7 min-w-7 place-items-center rounded-full bg-clay-dark px-1.5 text-sm text-white">{unread}</span>}
            </Link>
            <Link href="/campus/perfil" className={pill}>Mi perfil</Link>
            <form action={logoutAction}><button type="submit" className={`${pill} underline`}>Salir</button></form>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">{children}</div>
    </>
  );
}
