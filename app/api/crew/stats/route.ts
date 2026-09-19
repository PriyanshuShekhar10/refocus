import { NextRequest, NextResponse } from "next/server";
import { getCrewStats } from "@/lib/crewStats";
import { crewFetchDays, parseCrewRangeMode } from "@/app/crew/crewShared";

export async function GET(req: NextRequest) {
  const daysParam = req.nextUrl.searchParams.get("days");
  if (daysParam && daysParam !== "all" && !Number.isFinite(Number(daysParam))) {
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });
  }

  const stats = await getCrewStats(crewFetchDays(parseCrewRangeMode(daysParam)));
  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
