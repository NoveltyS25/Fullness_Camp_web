import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AcceptForm } from "@/components/campus/AcceptForm";
import { expectedKeysFor, missingDocuments } from "@/server/acceptance";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata: Metadata = {
  title: "Contrato y políticas",
  robots: { index: false, follow: false },
};

export default async function Aceptar() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  const db = getDb();
  if ((await missingDocuments(db, user)).length === 0) redirect("/campus");
  const keys = await expectedKeysFor(db, user);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-5 py-12">
      <Image src="/brand/logo.png" alt="Fullness Camp" width={96} height={91} className="mx-auto" priority />
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">Antes de entrar a tu campus</h1>
        <p className="text-lg text-muted">
          Para continuar necesitamos que leas y aceptes el contrato y las políticas de tu programa. Guardamos la fecha, la hora y la versión exacta de cada documento que aceptas.
        </p>
      </div>
      <AcceptForm keys={keys} />
    </main>
  );
}
