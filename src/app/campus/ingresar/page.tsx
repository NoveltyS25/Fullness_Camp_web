import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/campus/LoginForm";
import { getCurrentProfile } from "@/lib/campus/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Ingresar al campus",
  robots: { index: false, follow: false },
};

export default async function Ingresar(props: PageProps<"/campus/ingresar">) {
  const configured = isSupabaseConfigured();
  if (configured && (await getCurrentProfile())) redirect("/campus");
  const { error } = await props.searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-5 py-12">
      <Link href="/" className="mx-auto" aria-label="Fullness Camp, ir al sitio">
        <Image src="/brand/logo.png" alt="Fullness Camp" width={110} height={104} priority />
      </Link>
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">Campus virtual</h1>
        <p className="text-lg text-muted">Consulta tus horarios y recibe avisos de tus clases.</p>
      </div>

      {error === "enlace" && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-lg text-red-900">
          Ese enlace ya no es válido. Pide uno nuevo aquí abajo.
        </p>
      )}

      {configured ? (
        <LoginForm />
      ) : (
        <p className="rounded-xl bg-clay-soft p-4 text-lg">El campus se está configurando. Muy pronto podrás entrar.</p>
      )}
    </main>
  );
}
