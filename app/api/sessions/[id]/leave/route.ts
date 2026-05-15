import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { publish, sessionsChannel } from "@/lib/sse";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";

type SessionDoc = {
  _id: ObjectId;
  owner_id: string;
  session_participants?: Array<{
    user_id: string;
    joined_at: Date | string;
    quiet?: boolean;
  }>;
};

// POST /api/sessions/:id/leave – participant leaves; session stays, becomes available for owner
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  type AuthUser = { id?: string };
  const userId = (session?.user as AuthUser | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit (prevent thrashing)
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

  const participants = s.session_participants ?? [];
  const isOwner = String(s.owner_id) === String(userId);
  const isParticipant = participants.some((p) => String(p.user_id) === String(userId));

  if (isOwner) {
    return NextResponse.json(
      { error: "Owner cannot leave; use delete to cancel the session" },
      { status: 400 },
    );
  }
  if (!isParticipant) {
    return NextResponse.json(
      { error: "You are not in this session" },
      { status: 403 },
    );
  }

  const newParticipants = participants.filter(
    (p) => String(p.user_id) !== String(userId),
  );

  await col.updateOne(
    { _id: new ObjectId(sessionId) },
    {
      $set: {
        session_participants: newParticipants,
        status: "available",
        updated_at: new Date(),
      },
    },
  );

  await publish(sessionsChannel(), { type: "sessions_updated" });
  return NextResponse.json({ ok: true });
}
