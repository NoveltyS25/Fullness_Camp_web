import type { Metadata } from "next";
import Link from "next/link";
import { RecoverForm } from "@/components/campus/RecoverForm";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};

export default function Recuperar() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-5 py-12">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">Recuperar contraseña</h1>
        <p className="text-lg text-muted">Escribe tu cédula y tu correo. Te enviaremos un enlace para crear una contraseña nueva.</p>
      </div>
      <RecoverForm />
      <p className="text-center"><Link href="/campus/ingresar" className="text-lg font-medium text-clay-dark underline">← Volver a ingresar</Link></p>
    </main>
  );
}
