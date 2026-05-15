import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { publish, sessionsChannel } from "@/lib/sse";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { hasSessionOverlap } from "@/lib/sessionOverlap";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  type AuthUser = { id?: string };
  const userId = (session?.user as AuthUser | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit join attempts (prevents probing/spam)
  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const { id: sessionId } = await params;
  if (!ObjectId.isValid(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  // Parse optional body for quiet flag
  const body = (await req.json().catch(() => ({}))) as {
    quiet?: boolean;
  };
  const quiet: boolean = Boolean(body.quiet);
  const db = await getDb();
  type SessionDoc = {
    _id: ObjectId;
    owner_id: string;
    start_time: Date | string;
    end_time: Date | string;
    session_participants?: Array<{
      user_id: string;
      joined_at: Date | string;
      quiet?: boolean;
    }>;
  };
  const col = db.collection<SessionDoc>("sessions");

  // Look up the session first so we can validate it before mutating.
  const existing = await col.findOne({ _id: new ObjectId(sessionId) });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Already a participant? Treat as idempotent success without further checks.
  const alreadyIn = (existing.session_participants ?? []).some(
    (p) => String(p.user_id) === String(userId),
  );
  if (alreadyIn) return NextResponse.json({ ok: true });

  // Don't allow joining sessions that have already ended.
  const endTime = new Date(existing.end_time);
  if (endTime.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "This session has already ended" },
      { status: 400 },
    );
  }

  // Don't allow joining a session that would conflict with the user's calendar.
  const startTime = new Date(existing.start_time);
  if (await hasSessionOverlap(db, userId, startTime, endTime, sessionId)) {
    return NextResponse.json(
      { error: "You already have a session during this time" },
      { status: 409 },
    );
  }

  // Atomic check-and-update: only join if < 2 participants and user not already in.
  const result = await col.findOneAndUpdate(
    {
      _id: new ObjectId(sessionId),
      $and: [
        { $or: [{ session_participants: { $exists: false } }, { "session_participants.1": { $exists: false } }] },
        { "session_participants.user_id": { $ne: userId } },
      ],
    },
    {
      $push: {
        session_participants: {
          user_id: userId,
          joined_at: new Date(),
          quiet,
        },
      } as never,
      $set: { status: "booked", updated_at: new Date() },
    },
    { returnDocument: "after" }
  );

  if (!result) {
    // Race: someone else filled the second slot between findOne and findOneAndUpdate.
    const s = await col.findOne({ _id: new ObjectId(sessionId) });
    if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (s.session_participants?.some((p: { user_id: string }) => p.user_id === userId)) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Session already has 2 participants" }, { status: 409 });
  }

  await publish(sessionsChannel(), { type: "sessions_updated" });
  return NextResponse.json({ ok: true });
}
