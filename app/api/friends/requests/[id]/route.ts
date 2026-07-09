import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { requireVerifiedEmail } from "@/lib/requireVerifiedEmail";
import { areUsersBlocked } from "@/lib/blocking";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const emailGate = await requireVerifiedEmail(userId);
  if (emailGate) return emailGate;


  // Rate limit friend request responses
  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { id } = await params;
  const { action } = body as { action?: "accept" | "decline" };
  if (!action)
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  if (action !== "accept" && action !== "decline")
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  const db = await getDb();
  const nextStatus = action === "accept" ? "accepted" : "declined";

  if (action === "accept") {
    const pending = await db.collection("friend_requests").findOne(
      { _id: new ObjectId(id), to_user_id: userId, status: "pending" },
      { projection: { from_user_id: 1, to_user_id: 1 } },
    );
    if (
      pending &&
      (await areUsersBlocked(
        String(pending.from_user_id),
        String(pending.to_user_id),
      ))
    ) {
      return NextResponse.json(
        { error: "You cannot accept a friend request from this user" },
        { status: 403 },
      );
    }
  }

  // Atomic: only update if the request is still pending and belongs to this user
  const result = await db
    .collection("friend_requests")
    .findOneAndUpdate(
      { _id: new ObjectId(id), to_user_id: userId, status: "pending" },
      { $set: { status: nextStatus, responded_at: new Date() } },
      { returnDocument: "after" }
    );

  if (!result) {
    // Distinguish between not found, forbidden, and already responded
    const fr = await db.collection("friend_requests").findOne({ _id: new ObjectId(id) });
    if (!fr) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (fr.to_user_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Request already responded to" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
