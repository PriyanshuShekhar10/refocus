import { NextResponse } from "next/server";
import { getCrewMissedRank } from "@/lib/crewMissedRank";
import { requireCrewViewer } from "@/lib/crewAccess";

export async function GET() {
  const gate = await requireCrewViewer();
  if (!gate.ok) return gate.response;

  const rank = await getCrewMissedRank();
  return NextResponse.json(rank, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
