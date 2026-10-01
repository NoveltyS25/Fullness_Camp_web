import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
        Saltar al contenido
      </a>
      <SiteHeader />
      <div id="contenido" className="flex-1">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
