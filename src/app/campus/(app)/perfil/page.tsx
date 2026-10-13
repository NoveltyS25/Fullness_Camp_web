import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/campus/ProfileForm";
import { TeacherProfileForm } from "@/components/campus/TeacherProfileForm";
import { getTeacherProfile } from "@/server/curriculum";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Mi perfil" };

export default async function Perfil() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");

  const teacherProfile = user.role === "student" ? undefined : await getTeacherProfile(getDb(), user.id);

  return (
    <div className="max-w-xl">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Mi perfil</h1>
      <ProfileForm
        fullName={user.full_name}
        cedula={user.cedula}
        email={user.email}
        whatsappPhone={user.whatsapp_phone}
        notifyEmail={!!user.notify_email}
        notifyWhatsapp={!!user.notify_whatsapp}
      />
      {user.role !== "student" && (
        <section aria-labelledby="docente" className="mt-12 border-t border-clay-soft pt-8">
          <h2 id="docente" className="mb-2 text-2xl font-bold">Mi perfil de docente</h2>
          <p className="mb-6 text-lg text-muted">Esto lo ven tus estudiantes en el plan de estudios de las certificaciones donde dictas.</p>
          <TeacherProfileForm profile={teacherProfile} />
        </section>
      )}
      <p className="mt-10 border-t border-clay-soft pt-6 text-lg">
        <Link href="/campus/cambiar-clave" className="font-medium text-clay-dark underline">Cambiar mi contraseña</Link>
      </p>
    </div>
  );
}
