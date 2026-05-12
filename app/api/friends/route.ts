import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// GET /api/friends - list accepted friends for current user
// Supports pagination: ?limit=50&cursor=<user_id>
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const cursor = searchParams.get("cursor"); // user_id to start after

  const db = await getDb();
  // Friends are accepted friend_requests where current user is either side
  const requests = await db
    .collection<{ _id: ObjectId; from_user_id: string; to_user_id: string; status: string; created_at: Date; responded_at?: Date; updated_at?: Date }>(
      "friend_requests"
    )
    .find({
      status: "accepted",
      $or: [{ from_user_id: userId }, { to_user_id: userId }],
    })
    .toArray();

  const otherIds = Array.from(
    new Set(
      requests.map((r) =>
        r.from_user_id === userId ? r.to_user_id : r.from_user_id
      )
    )
  ).filter(Boolean);

  let usersById: Record<string, { email?: string; name?: string; username?: string }> = {};
  if (otherIds.length > 0) {
    const users = await db
      .collection<{ _id: ObjectId; email?: string; name?: string; username?: string }>("users")
      .find({ _id: { $in: otherIds.map((id: string) => new ObjectId(id)) } })
      .project({ email: 1, name: 1, username: 1 })
      .toArray();
    usersById = Object.fromEntries(
      users.map((u) => [String(u._id), { email: u.email, name: u.name, username: u.username }])
    );
  }

  // Deduplicate friendships: if there are multiple accepted requests for the same pair,
  // keep the earliest 'since' date (friendship start).
  const friendsMap = new Map<
    string,
    { user_id: string; email?: string; name?: string; username?: string; since?: Date }
  >();
  for (const r of requests) {
    const otherId = r.from_user_id === userId ? r.to_user_id : r.from_user_id;
    if (!otherId) continue;
    const user = usersById[otherId] || {};
    const since: Date = (r.responded_at ||
      r.updated_at ||
      r.created_at) as Date;
    const existing = friendsMap.get(otherId);
    if (!existing) {
      friendsMap.set(otherId, {
        user_id: otherId,
        email: user.email || undefined,
        name: user.name || undefined,
        username: user.username || undefined,
        since,
      });
    } else if (existing.since && since && since < existing.since) {
      // Keep the earliest since date
      existing.since = since;
      friendsMap.set(otherId, existing);
    }
  }

  // Sort by user_id for stable cursor-based pagination
  const allFriends = Array.from(friendsMap.values())
    .map((f) => ({
      ...f,
      since: f.since ? new Date(f.since).toISOString() : undefined,
    }))
    .sort((a, b) => a.user_id.localeCompare(b.user_id));

  // Apply cursor: skip everything up to and including the cursor value
  let startIdx = 0;
  if (cursor) {
    const idx = allFriends.findIndex((f) => f.user_id === cursor);
    if (idx !== -1) startIdx = idx + 1;
  }

  const page = allFriends.slice(startIdx, startIdx + limit);
  const nextCursor =
    startIdx + limit < allFriends.length
      ? page[page.length - 1]?.user_id ?? null
      : null;

  return NextResponse.json({ friends: page, nextCursor, total: allFriends.length });
}
