import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { createOrGetDailyRoom, createDailyMeetingToken } from "@/lib/daily";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { isOwnerOrParticipant, toObjectId } from "@/lib/sessionAccess";

type SessionDoc = {
  owner_id: string;
  end_time: Date | string;
  session_participants?: Array<{ user_id: string }>;
};

// POST /api/sessions/[id]/daily/token -> returns a meeting token for the session’s Daily room
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const { id: sessionId } = await params;
  const sessionObjectId = toObjectId(sessionId);
  if (!sessionObjectId) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const db = await getDb();
  const s = await db.collection<SessionDoc>("sessions").findOne({ _id: sessionObjectId });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isOwnerOrParticipant(s, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const sessionEndExp = Math.floor(new Date(s.end_time).getTime() / 1000) + 30 * 60;
    const { roomName, domain } = await createOrGetDailyRoom(sessionId, sessionEndExp);
    const token = await createDailyMeetingToken(roomName, userId);
    return NextResponse.json({ token, roomName, domain });
  } catch (e) {
    console.error("[DailyToken] Failed to create token", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
