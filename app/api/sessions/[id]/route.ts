import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(
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
  if (s.owner_id !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await db.collection("sessions").deleteOne({ _id: new ObjectId(sessionId) });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
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
  if (s.owner_id !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { name, color } = body as {
    name?: string | null;
    color?: string | null;
  };
  const updates: {
    updated_at: string;
    name?: string | null;
    color?: string | null;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (typeof name !== "undefined") updates.name = name;
  if (typeof color !== "undefined") updates.color = color;

  await db
    .collection("sessions")
    .updateOne({ _id: new ObjectId(sessionId) }, { $set: updates as any });
  return NextResponse.json({ ok: true });
}
