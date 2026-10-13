import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/campus/PrintButton";
import { getProgram } from "@/data/programs";
import { getCertificate } from "@/server/curriculum";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/web";

export const metadata = { title: "Mi certificado" };

const day = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "long" });

export default async function Certificado(props: PageProps<"/campus/certificado/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/campus/ingresar");
  const { id } = await props.params;
  const cert = await getCertificate(getDb(), user, id);
  if (!cert) notFound();
  const title = getProgram(cert.program_slug)?.title ?? cert.program_slug;

  return (
    <div className="space-y-6">
      <p className="print:hidden"><Link href="/campus/cursos" className="underline">← Mis cursos</Link></p>
      <div className="rounded-3xl border-4 border-double border-clay bg-white p-8 text-center sm:p-14 print:border-2">
        <Image src="/brand/logo.png" alt="Fullness Camp" width={96} height={90} className="mx-auto mb-6" />
        <p className="mb-6 font-medium uppercase tracking-widest text-clay-dark">Certificado de finalización</p>
        <p className="text-lg">Fullness Camp certifica que</p>
        <h1 className="my-4 text-3xl font-bold sm:text-5xl">{cert.full_name}</h1>
        <p className="text-lg">con cédula {cert.cedula} completó satisfactoriamente</p>
        <h2 className="my-4 text-2xl font-bold text-clay-dark sm:text-3xl">{title}</h2>
        <p className="text-lg">el {day.format(new Date(cert.completed_at))}</p>
        <p className="mt-10 text-sm text-muted">Código de verificación: <strong>{cert.certificate_code}</strong></p>
      </div>
      <div className="print:hidden"><PrintButton /></div>
    </div>
  );
}
