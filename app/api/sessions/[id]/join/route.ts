import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = params;
  const db = await getDb();
  const s = await db
    .collection("sessions")
    .findOne({ _id: new ObjectId(sessionId) });
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
  if (s.session_participants?.some((p: any) => p.user_id === userId)) {
    return NextResponse.json({ ok: true });
  }
  // Add participant and set status
  await db.collection("sessions").updateOne({ _id: new ObjectId(sessionId) }, {
    $push: {
      session_participants: { user_id: userId, joined_at: new Date() },
    } as any,
    $set: { status: "booked", updated_at: new Date() },
  } as any);

  return NextResponse.json({ ok: true });
}
