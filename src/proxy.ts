import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Mientras MAINTENANCE_MODE=true todas las rutas muestran /mantenimiento con 503,
// para que Google entienda que es temporal y no desindexe el sitio.
export function proxy(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE !== "true") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/mantenimiento";
  url.search = "";
  return NextResponse.rewrite(url, {
    status: 503,
    headers: { "Retry-After": "86400", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export const config = {
  matcher: ["/((?!_next/|brand/|favicon.ico|icon.png|mantenimiento).*)"],
};
