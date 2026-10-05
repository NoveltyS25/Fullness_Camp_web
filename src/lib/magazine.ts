import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface MagazineManifest {
  slug: string;
  paginas: string[];
  ancho: number;
  alto: number;
  horizontal: boolean;
}

/** Lee el manifest que genera scripts/build-magazines.py. Devuelve null si el programa aún no tiene revista. */
export function getMagazine(slug: string): MagazineManifest | null {
  const file = path.join(process.cwd(), "public", "revistas", slug, "manifest.json");
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as MagazineManifest;
}
