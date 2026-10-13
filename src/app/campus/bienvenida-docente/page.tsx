import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { TeacherOnboardingForm } from "@/components/campus/TeacherOnboardingForm";
import { isPendingCedula } from "@/server/users";
import { getCurrentUser } from "@/server/web";

export const metadata: Metadata = {
  title: "Completa tu registro de docente",
  robots: { index: false, follow: false },
};

export default async function BienvenidaDocente() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  if (user.role === "student" || !isPendingCedula(user.cedula)) redirect("/campus");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-5 py-12">
      <Image src="/brand/logo.png" alt="Fullness Camp" width={96} height={91} className="mx-auto" priority />
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">Bienvenida al campus de Fullness Camp</h1>
        <p className="text-lg text-muted">
          Tu primer paso: completa tus datos. Tus estudiantes verán tu nombre, tu correo y tu WhatsApp para contactarte. Después agregarás las clases que
          dictas y sus horarios.
        </p>
      </div>
      <TeacherOnboardingForm fullName={user.full_name} email={user.email} />
    </main>
  );
}
