import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { isUserAdmin } from "@/lib/admin";
import { isEngagementCrewUserId } from "@/lib/engagementCrew";

/** Crew board is visible to engagement-crew members and admins. */
export async function canViewCrewBoard(
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const [isAdmin, isCrew] = await Promise.all([
    isUserAdmin(userId),
    isEngagementCrewUserId(userId),
  ]);
  return isAdmin || isCrew;
}

type CrewViewerGuard =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireCrewViewer(): Promise<CrewViewerGuard> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!(await canViewCrewBoard(userId))) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, userId };
}
