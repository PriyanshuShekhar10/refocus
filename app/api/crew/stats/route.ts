import { NextRequest, NextResponse } from "next/server";
import { getCrewStats } from "@/lib/crewStats";

export async function GET(req: NextRequest) {
  const daysParam = req.nextUrl.searchParams.get("days");
  const days = daysParam ? Number(daysParam) : 14;
  if (!Number.isFinite(days)) {
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });
  }

  const stats = await getCrewStats(days);
  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
