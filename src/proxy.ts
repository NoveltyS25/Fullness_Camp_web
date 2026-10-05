import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Mientras MAINTENANCE_MODE=true todas las rutas muestran /mantenimiento con 503,
  // para que Google entienda que es temporal y no desindexe el sitio.
  if (process.env.MAINTENANCE_MODE === "true") {
    const url = request.nextUrl.clone();
    url.pathname = "/mantenimiento";
    url.search = "";
    return NextResponse.rewrite(url, {
      status: 503,
      headers: { "Retry-After": "86400", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|brand/|favicon.ico|icon.png|mantenimiento).*)"],
};
