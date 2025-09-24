import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { id } = await params;
  const { action } = body as { action?: "accept" | "decline" };
  if (!action)
    return NextResponse.json({ error: "Missing action" }, { status: 400 });

  const db = await getDb();
  const fr = await db
    .collection("friend_requests")
    .findOne({ _id: new ObjectId(id) });
  if (!fr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (fr.to_user_id !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const nextStatus = action === "accept" ? "accepted" : "declined";
  await db
    .collection("friend_requests")
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: nextStatus, responded_at: new Date() } }
    );
  return NextResponse.json({ ok: true });
}
