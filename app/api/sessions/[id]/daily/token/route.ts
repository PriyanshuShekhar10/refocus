import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createOrGetDailyRoom, createDailyMeetingToken } from "@/lib/daily";

// POST /api/sessions/[id]/daily/token -> returns a meeting token for the session’s Daily room
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await params;
  const db = await getDb();
  const s = await db
    .collection("sessions")
    .findOne({ _id: new ObjectId(sessionId) });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { roomName, domain } = await createOrGetDailyRoom(sessionId);
    const token = await createDailyMeetingToken(roomName, userId);
    return NextResponse.json({ token, roomName, domain });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
