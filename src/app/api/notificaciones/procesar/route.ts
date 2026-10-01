import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { processPendingDeliveries } from "@/lib/campus/dispatch";

// Reintenta los avisos pendientes. Lo llama un cron (por ejemplo el de Vercel, que envía
// "Authorization: Bearer <CRON_SECRET>" automáticamente).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const ok =
    !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const result = await processPendingDeliveries(50);
  return NextResponse.json(result);
}
