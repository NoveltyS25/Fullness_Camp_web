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
    case "leaf":
      return <svg {...common}><path d="M5 19c0-8 5-13 15-14 0 10-5 15-13 15" /><path d="M5 19c3-4 6-6 10-8" /></svg>;
    case "heart":
      return <svg {...common}><path d="M12 20s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" /></svg>;
    case "sparkles":
      return <svg {...common}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></svg>;
    case "book":
      return <svg {...common}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15Z" /></svg>;
    case "cross":
      return <svg {...common}><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M12 8v8M8 12h8" /></svg>;
  }
}
