import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/campus/ProfileForm";
import { getCurrentProfile } from "@/lib/campus/auth";

export const metadata = { title: "Mi perfil" };

export default async function Perfil() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/campus/ingresar");

  return (
    <div className="max-w-xl">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Mi perfil</h1>
      <ProfileForm profile={profile} />
    </div>
  );
}
