import type { Metadata } from "next";
import Link from "next/link";
import { PasswordForm } from "@/components/campus/PasswordForm";
import { peekPasswordReset } from "@/server/auth";
import { getDb } from "@/server/db";
import { resetPasswordAction } from "../actions";

export const metadata: Metadata = {
  title: "Crear contraseña nueva",
  robots: { index: false, follow: false },
};

export default async function Restablecer(props: PageProps<"/campus/restablecer">) {
  const { token, error } = await props.searchParams;
  const t = Array.isArray(token) ? token[0] : token;
  const valid = t ? await peekPasswordReset(getDb(), t) : false;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-5 py-12">
      <h1 className="text-center text-3xl font-bold">Crear contraseña nueva</h1>
      {valid && t ? (
        <PasswordForm action={resetPasswordAction} submitLabel="Guardar contraseña" token={t} initialError={Array.isArray(error) ? error[0] : error} />
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-lg">Este enlace ya no es válido o venció.</p>
          <Link href="/campus/recuperar" className="btn btn-primary">Pedir un enlace nuevo</Link>
        </div>
      )}
    </main>
  );
}
