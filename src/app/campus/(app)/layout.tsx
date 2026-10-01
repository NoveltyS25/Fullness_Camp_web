import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canTeach, getCurrentProfile } from "@/lib/campus/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const metadata: Metadata = {
  title: { default: "Campus virtual", template: "%s | Campus Fullness Camp" },
  robots: { index: false, follow: false },
};

const pill = "inline-flex min-h-12 items-center rounded-full px-4 font-medium text-ink hover:bg-clay-soft";

export default async function CampusLayout({ children }: LayoutProps<"/campus">) {
  if (!isSupabaseConfigured()) redirect("/campus/ingresar");
  const profile = await getCurrentProfile();
  if (!profile) redirect("/campus/ingresar");

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  return (
    <>
      <header className="border-b border-clay-soft bg-sand">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link href="/campus" className="flex items-center gap-3" aria-label="Campus Fullness Camp, ir al horario">
            <Image src="/brand/logo.png" alt="" width={48} height={45} />
            <span className="font-serif text-xl font-bold text-clay-dark">Campus</span>
          </Link>
          <nav aria-label="Campus" className="flex flex-wrap items-center gap-1">
            <Link href="/campus" className={pill}>Mi horario</Link>
            {canTeach(profile) && <Link href="/campus/profesor" className={pill}>Mis clases</Link>}
            {profile.role === "admin" && <Link href="/campus/admin" className={pill}>Administración</Link>}
            <Link href="/campus/avisos" className={pill}>
              Avisos
              {!!count && <span className="ml-2 grid h-7 min-w-7 place-items-center rounded-full bg-clay-dark px-1.5 text-sm text-white">{count}</span>}
            </Link>
            <Link href="/campus/perfil" className={pill}>Mi perfil</Link>
            <form action={signOut}><button type="submit" className={`${pill} underline`}>Salir</button></form>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">{children}</div>
    </>
  );
}
