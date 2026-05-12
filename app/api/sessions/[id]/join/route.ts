import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { publish, sessionsChannel } from "@/lib/sse";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  type AuthUser = { id?: string };
  const userId = (session?.user as AuthUser | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await params;
  // Parse optional body for quiet flag
  const body = (await req.json().catch(() => ({}))) as {
    quiet?: boolean;
  };
  const quiet: boolean = Boolean(body.quiet);
  const db = await getDb();
  type SessionDoc = {
    _id: ObjectId;
    owner_id: string;
    session_participants?: Array<{
      user_id: string;
      joined_at: Date | string;
      quiet?: boolean;
    }>;
  };
  const col = db.collection<SessionDoc>("sessions");

  // Atomic check-and-update: only join if < 2 participants and user not already in
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
    // Distinguish: not found vs already joined vs full
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
