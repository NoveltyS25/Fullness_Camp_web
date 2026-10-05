import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { listLeads } from "@/server/leads";
import { getCurrentUser } from "@/server/web";

// Se protege con la sesión de administradora: sin sesión o sin rol, la respuesta es la misma que si no existiera.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return new NextResponse("No encontrado", { status: 404 });

  const rows = await listLeads(getDb(), 5000);
  // Las celdas que empiezan por = + - @ se prefijan con ' para que Excel no las ejecute como fórmulas.
  const cell = (v: string | null) => {
    const s = (v ?? "").replace(/"/g, '""');
    return `"${/^[=+\-@\t\r]/.test(s) ? `'${s}` : s}"`;
  };
  const header = ["fecha", "programa", "interes", "nombre", "correo", "whatsapp", "origen"].join(",");
  const lines = rows.map((r) => {
    let origin = "";
    try {
      const a = JSON.parse(r.attribution ?? "{}") as Record<string, string>;
      origin = [a.utm_source, a.utm_medium, a.utm_campaign].filter(Boolean).join(" / ") || a.referrer || "";
    } catch {
      /* sin atribución */
    }
    return [r.created_at, r.program_slug, r.interest, r.full_name, r.email, r.whatsapp, origin].map(cell).join(",");
  });

  return new NextResponse("﻿" + [header, ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="interesadas.csv"',
      "Cache-Control": "no-store",
    },
  });
}
