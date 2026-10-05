import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/campus/PasswordForm";
import { getCurrentUser } from "@/server/web";
import { changePasswordAction } from "../actions";

export const metadata: Metadata = {
  title: "Crea tu contraseña",
  robots: { index: false, follow: false },
};

export default async function CambiarClave() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  const first = user.must_change_password === 1;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-5 py-12">
      <Image src="/brand/logo.png" alt="Fullness Camp" width={96} height={91} className="mx-auto" priority />
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">{first ? "Crea tu contraseña" : "Cambiar contraseña"}</h1>
        <p className="text-lg text-muted">
          {first
            ? `Hola ${user.full_name.split(" ")[0]}, para proteger tu cuenta crea una contraseña que solo tú conozcas. La temporal que te enviamos dejará de funcionar.`
            : "Elige una contraseña nueva para tu cuenta."}
        </p>
      </div>
      <PasswordForm action={changePasswordAction} submitLabel="Guardar y entrar" askCurrent={!first} />
    </main>
  );
}
