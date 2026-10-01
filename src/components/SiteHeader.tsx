import Image from "next/image";
import Link from "next/link";
import { CartLink } from "./CartLink";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/programas", label: "Programas" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-clay-soft bg-sand/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="Fullness Camp, ir al inicio">
          <Image src="/brand/logo.png" alt="" width={56} height={53} priority />
          <span className="hidden font-serif text-xl font-bold text-clay-dark sm:block">Fullness Camp</span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-2 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-12 items-center rounded-full px-4 font-medium text-ink hover:bg-clay-soft">
              {l.label}
            </Link>
          ))}
          <CartLink />
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <CartLink />
          <details className="group relative">
            <summary className="grid h-12 w-12 cursor-pointer list-none place-items-center rounded-full text-clay-dark hover:bg-clay-soft [&::-webkit-details-marker]:hidden" aria-label="Abrir menú">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <nav aria-label="Menú móvil" className="absolute right-0 mt-2 w-64 rounded-2xl border border-clay-soft bg-white p-2 shadow-xl">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="flex min-h-14 items-center rounded-xl px-4 text-lg font-medium hover:bg-clay-soft">
                  {l.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
