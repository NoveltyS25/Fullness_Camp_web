"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitWith } from "@/lib/form";
import { loginAction, type FormState } from "@/app/campus/actions";

const input = "min-h-14 w-full rounded-xl border-2 border-clay-soft bg-white px-4 text-lg";

export function LoginForm({ defaultCedula = "" }: { defaultCedula?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);

  return (
    <form onSubmit={submitWith(action)} className="space-y-5">
      <div>
        <label htmlFor="cedula" className="mb-2 block text-lg font-medium">Cédula</label>
        <input id="cedula" name="cedula" inputMode="numeric" autoComplete="username" required defaultValue={defaultCedula} className={input} placeholder="Solo números" />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-lg font-medium">Contraseña</label>
        <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className={input} />
        <label className="mt-3 flex items-center gap-3 text-lg">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-6 w-6 accent-[#7a4a45]" />
          Mostrar contraseña
        </label>
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Entrando…" : "Entrar al campus"}
      </button>
      <p role="alert" aria-live="assertive" className="text-lg text-red-800">{state.error}</p>
      <p className="text-center text-lg">
        <Link href="/campus/recuperar" className="font-medium text-clay-dark underline">Olvidé mi contraseña</Link>
      </p>
    </form>
  );
}
