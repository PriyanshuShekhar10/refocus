import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isEngagementCrewUserId } from "@/lib/engagementCrew";

/** Lightweight flag for temporary crew scheduling UI (e.g. grey out 25 min). */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isCrew = await isEngagementCrewUserId(userId);
  return NextResponse.json({ isCrew });
}
