import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { chatChannel, publish } from "@/lib/sse";
import { publishAbly } from "@/lib/ably-server";

// DELETE /api/friends/:friendId — remove an existing friendship.
// Idempotent in spirit but returns 404 when no accepted relation exists so the
// client can distinguish a stale UI from a successful removal.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> },
) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(currentUserId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const { friendId } = await params;
  if (!ObjectId.isValid(friendId))
    return NextResponse.json({ error: "Invalid friend id" }, { status: 400 });
  if (friendId === currentUserId)
    return NextResponse.json(
      { error: "Cannot unfriend yourself" },
      { status: 400 },
    );

  const db = await getDb();

  // Remove every accepted friend_request between the pair. deleteMany guards
  // against duplicate accepted rows (the list endpoint already dedups them).
  const result = await db.collection("friend_requests").deleteMany({
    status: "accepted",
    $or: [
      { from_user_id: currentUserId, to_user_id: friendId },
      { from_user_id: friendId, to_user_id: currentUserId },
    ],
  });

  if (result.deletedCount === 0)
    return NextResponse.json({ error: "Not friends" }, { status: 404 });

  // Cancel any still-pending session requests between the pair. After
  // unfriending, neither side should be able to accept them, and the
  // session-requests POST already blocks new ones via areFriends().
  try {
    const pendingReqs = await db
      .collection("session_requests")
      .find({
        status: "pending",
        $or: [
          { from_user_id: currentUserId, to_user_id: friendId },
          { from_user_id: friendId, to_user_id: currentUserId },
        ],
      })
      .toArray();

    if (pendingReqs.length > 0) {
      const ids = pendingReqs.map((r) => r._id);
      const idStrings = ids.map(String);
      await db
        .collection("session_requests")
        .deleteMany({ _id: { $in: ids } });
      await db
        .collection("messages")
        .updateMany(
          { "payload.sessionRequestId": { $in: idStrings } },
          { $set: { "payload.status": "cancelled" } },
        );
      const channel = chatChannel(currentUserId, friendId);
      await Promise.all(
        idStrings.flatMap((id) => {
          const event = {
            type: "session-request:update" as const,
            payload: { id, status: "cancelled" as const },
          };
          return [publish(channel, event), publishAbly(channel, event)];
        }),
      );
    }
  } catch {
    // Best-effort. The friendship itself is already removed.
  }

  return NextResponse.json({ ok: true, removed: result.deletedCount });
}
