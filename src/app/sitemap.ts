import type { MetadataRoute } from "next";
import { programs } from "@/data/programs";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fullnesscampinternacional.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/programas", "/contacto"].map((path) => ({ url: `${base}${path}` }));
  const detail = programs.map((p) => ({ url: `${base}/programas/${p.slug}` }));
  return [...pages, ...detail];
}
