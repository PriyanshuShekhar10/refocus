import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Shared session document type for this file
type SessionDoc = {
  _id: ObjectId;
  owner_id: string;
  start_time: Date;
  end_time: Date;
  name?: string | null;
  color?: string | null;
  session_participants?: Array<{
    user_id: string;
    joined_at: Date | string;
    quiet?: boolean;
  }>;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  type AuthUser = { id?: string };
  const userId = (session?.user as AuthUser | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = params;
  const db = await getDb();
  const col = db.collection<SessionDoc>("sessions");
  const s = await col.findOne({ _id: new ObjectId(sessionId) });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const participants: Array<{
    user_id: string;
    joined_at: string;
    quiet?: boolean;
  }> = (s.session_participants || []).map((p) => ({
    user_id: String(p.user_id),
    joined_at: String(p.joined_at),
    quiet: Boolean(p.quiet),
  }));
  const isBooked = participants.length >= 2;
  const isOwner = String(s.owner_id) === String(userId);
  const isParticipant = participants.some((p) => p.user_id === userId);
  if (isBooked && !(isOwner || isParticipant)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const you = participants.find((p) => p.user_id === userId);
  return NextResponse.json({
    id: String(s._id),
    owner_id: String(s.owner_id),
    start: new Date(s.start_time).toISOString(),
    end: new Date(s.end_time).toISOString(),
    participants,
    youQuiet: you ? Boolean(you.quiet) : undefined,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  type AuthUser = { id?: string };
  const userId = (session?.user as AuthUser | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: sessionId } = params;
  const db = await getDb();
  const col = db.collection<SessionDoc>("sessions");
  const s = await col.findOne({ _id: new ObjectId(sessionId) });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (s.owner_id !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await col.deleteOne({ _id: new ObjectId(sessionId) });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  type AuthUser = { id?: string };
  const userId = (session?.user as AuthUser | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = params;
  const db = await getDb();
  const col = db.collection<SessionDoc>("sessions");
  const s = await col.findOne({ _id: new ObjectId(sessionId) });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (s.owner_id !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string | null;
    color?: string | null;
  };
  const { name, color } = body;
  const updates: Partial<SessionDoc> & { updated_at: Date } = {
    updated_at: new Date(),
  };
  if (typeof name !== "undefined") updates.name = name;
  if (typeof color !== "undefined") updates.color = color;

  await col.updateOne({ _id: new ObjectId(sessionId) }, { $set: updates });
  return NextResponse.json({ ok: true });
}
