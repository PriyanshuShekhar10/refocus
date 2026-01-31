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
  const s = await col.findOne({ _id: new ObjectId(sessionId) });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cannot join more than 2 participants
  const count = s.session_participants?.length ?? 0;
  if (count >= 2) {
    return NextResponse.json(
      { error: "Session already has 2 participants" },
      { status: 409 }
    );
  }
  // Do not duplicate
  if (
    s.session_participants?.some(
      (p: { user_id: string }) => p.user_id === userId
    )
  ) {
    return NextResponse.json({ ok: true });
  }
  // Add participant and set status
  await col.updateOne(
    { _id: new ObjectId(sessionId) },
    {
      $push: {
        session_participants: {
          $each: [
            {
              user_id: userId,
              joined_at: new Date(),
              quiet,
            },
          ],
        },
      },
      $set: { status: "booked", updated_at: new Date() },
    }
  );

  await publish(sessionsChannel(), { type: "sessions_updated" });
  return NextResponse.json({ ok: true });
}
