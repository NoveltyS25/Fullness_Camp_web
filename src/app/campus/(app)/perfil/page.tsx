import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/campus/ProfileForm";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Mi perfil" };

export default async function Perfil() {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");

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
      <p className="mt-10 border-t border-clay-soft pt-6 text-lg">
        <Link href="/campus/cambiar-clave" className="font-medium text-clay-dark underline">Cambiar mi contraseña</Link>
      </p>
    </div>
  );
}
