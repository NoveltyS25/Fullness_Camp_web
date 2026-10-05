import type { FactIcon } from "@/data/landing";

const common = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/** Íconos de línea para los datos rápidos de cada programa (decorativos: el texto ya dice lo mismo). */
export function FactGlyph({ name }: { name: FactIcon }) {
  switch (name) {
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "laptop":
      return <svg {...common}><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></svg>;
    case "pin":
      return <svg {...common}><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M8 3v4M16 3v4" /></svg>;
    case "award":
      return <svg {...common}><circle cx="12" cy="9" r="5.5" /><path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7" /></svg>;
    case "users":
      return <svg {...common}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.3c2 .6 3.5 2.4 3.5 5.7" /></svg>;
    case "gift":
      return <svg {...common}><rect x="3.5" y="8.5" width="17" height="4" rx="1" /><path d="M5 12.5V20h14v-7.5M12 8.5V20M12 8.5c-1-3.5-5-3.5-5-1s3 2.5 5 1ZM12 8.5c1-3.5 5-3.5 5-1s-3 2.5-5 1Z" /></svg>;
    case "mountain":
      return <svg {...common}><path d="m3 19 6.5-11 4 6.5 2.5-4L21 19H3Z" /></svg>;
  }
}
