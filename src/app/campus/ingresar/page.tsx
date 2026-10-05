import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/campus/LoginForm";
import { getCurrentUser } from "@/server/web";

export const metadata: Metadata = {
  title: "Ingresar al campus virtual",
  robots: { index: false, follow: false },
};

export default async function Ingresar(props: PageProps<"/campus/ingresar">) {
  if (await getCurrentUser()) redirect("/campus");
  const { clave } = await props.searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-5 py-12">
      <Link href="/" className="mx-auto" aria-label="Fullness Camp, ir al sitio">
        <Image src="/brand/logo.png" alt="Fullness Camp" width={110} height={104} priority />
      </Link>
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">Campus virtual</h1>
        <p className="text-lg text-muted">Entra con tu cédula y tu contraseña para ver tus clases y horarios.</p>
      </div>

      {clave === "ok" && (
        <p role="status" className="rounded-xl bg-clay-soft p-4 text-lg font-medium text-clay-dark">
          ✓ Tu contraseña quedó guardada. Ya puedes entrar.
        </p>
      )}

      <LoginForm />

      <p className="text-center text-muted">
        ¿Aún no tienes cuenta? Se crea automáticamente cuando pagas tu programa y te llega un correo con los pasos.{" "}
        <Link href="/programas" className="font-medium text-clay-dark underline">Ver programas</Link>
      </p>
    </main>
  );
}
