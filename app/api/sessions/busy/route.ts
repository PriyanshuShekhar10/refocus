import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { areFriends } from "@/lib/friendship";

// GET /api/sessions/busy?from=ISO&to=ISO&friendId=xxx
// Returns busy time slots for current user and optionally a friend
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  type AuthUser = { id?: string };
  const userId = (session?.user as AuthUser | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  let friendId = searchParams.get("friendId");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing from/to query params (ISO datetime)" },
      { status: 400 },
    );
  }

  const db = await getDb();
  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid from/to query params" },
      { status: 400 },
    );
  }

  if (friendId && friendId !== userId) {
    if (!(await areFriends(userId, friendId))) {
      // Silently drop friendId to prevent calendar enumeration
      friendId = null;
    }
  }

  // Get sessions where either the current user or the friend is a participant
  const userIds = [userId];
  if (friendId && friendId !== userId) {
    userIds.push(friendId);
  }

  type SessionDoc = {
    _id: unknown;
    start_time: Date;
    end_time: Date;
    session_participants?: Array<{ user_id: string }>;
  };

  const sessions = (await db
    .collection<SessionDoc>("sessions")
    .find({
      "session_participants.user_id": { $in: userIds },
      // Session overlaps with the range if: start < toDate AND end > fromDate
      start_time: { $lt: toDate },
      end_time: { $gt: fromDate },
    })
    .project({ start_time: 1, end_time: 1, session_participants: 1 })
    .toArray()) as SessionDoc[];

  // Separate busy slots by user
  const myBusySlots: Array<{ start: string; end: string }> = [];
  const friendBusySlots: Array<{ start: string; end: string }> = [];

  for (const s of sessions) {
    const slot = {
      start: s.start_time.toISOString(),
      end: s.end_time.toISOString(),
    };

    const participants = s.session_participants ?? [];
    const iAmParticipant = participants.some((p) => p.user_id === userId);
    const friendIsParticipant =
      friendId && participants.some((p) => p.user_id === friendId);

    if (iAmParticipant) {
      myBusySlots.push(slot);
    }
    if (friendIsParticipant) {
      friendBusySlots.push(slot);
    }
  }

  return NextResponse.json({
    myBusySlots,
    friendBusySlots,
  });
}
