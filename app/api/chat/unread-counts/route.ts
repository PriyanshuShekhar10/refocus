import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

// GET /api/chat/unread-counts
// Returns: { counts: Record<friendId, number> }
export async function GET() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const pipeline = [
    { $match: { to_user_id: currentUserId, read_at: null } },
    { $group: { _id: "$from_user_id", count: { $sum: 1 } } },
  ];
  const agg = await db.collection("messages").aggregate(pipeline).toArray();
  const counts = Object.fromEntries(
    (agg as Array<{ _id: string; count: number }>).map((r) => [String(r._id), r.count])
  );
  return NextResponse.json({ counts });
}


