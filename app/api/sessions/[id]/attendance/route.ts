import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";

// How close to end_time a leave needs to be for the session to count as
// "completed". Mirrors the client-side COMPLETION_GRACE_MS in ClientCall.tsx.
const COMPLETION_GRACE_MS = 60_000;

type SessionDoc = {
  _id: ObjectId;
  end_time: Date | string;
  session_participants?: Array<{
    user_id: string;
    call_joined_at?: Date | string;
    call_completed?: boolean;
    call_left_at?: Date | string;
  }>;
};

// POST /api/sessions/[id]/attendance
//
// Called by ClientCall when the user wraps up a session — either because the
// timer hit zero or they manually left near the end. The server validates
// completion independently of the client claim so a tampered client can't
// fake a clean completion.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const { id: sessionId } = await params;
  if (!ObjectId.isValid(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const db = await getDb();
  const col = db.collection<SessionDoc>("sessions");
  const s = await col.findOne({ _id: new ObjectId(sessionId) });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const participant = (s.session_participants ?? []).find(
    (p) => String(p.user_id) === String(userId),
  );
  if (!participant) {
    return NextResponse.json(
      { error: "Not a participant" },
      { status: 403 },
    );
  }

  const now = new Date();
  const endTime = new Date(s.end_time);
  // A session is considered "completed" when the user leaves within the grace
  // window of the official end (or after it). Earlier leaves are recorded
  // but don't count as completed.
  const completed = endTime.getTime() - now.getTime() < COMPLETION_GRACE_MS;

  const setOps: Record<string, unknown> = {
    "session_participants.$.call_left_at": now,
  };
  // Don't downgrade a previously-recorded completion. Once true, stays true.
  if (completed) {
    setOps["session_participants.$.call_completed"] = true;
  }

  await col.updateOne(
    {
      _id: new ObjectId(sessionId),
      "session_participants.user_id": userId,
    },
    { $set: setOps },
  );

  return NextResponse.json({ ok: true, completed });
}
