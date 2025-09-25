import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { userChannel, publish } from "@/lib/sse";

// POST /api/chat/:friendId/read
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { friendId } = await params;
  const db = await getDb();
  const now = new Date();
  await db
    .collection("messages")
    .updateMany({ from_user_id: friendId, to_user_id: currentUserId, read_at: null }, { $set: { read_at: now } });

  // publish to current user channel with updated count for that friend
  const unread = await db
    .collection("messages")
    .countDocuments({ from_user_id: friendId, to_user_id: currentUserId, read_at: null });
  publish(userChannel(currentUserId), { type: "unread:update", payload: { friendId, count: unread } });
  return NextResponse.json({ ok: true });
}


