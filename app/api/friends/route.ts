import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/friends - list accepted friends for current user with emails
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  // Friends are accepted friend_requests where current user is either side
  const requests = await db
    .collection("friend_requests")
    .find({
      status: "accepted",
      $or: [{ from_user_id: userId }, { to_user_id: userId }],
    })
    .toArray();

  const otherIds = Array.from(
    new Set(
      requests.map((r: any) =>
        r.from_user_id === userId ? r.to_user_id : r.from_user_id
      )
    )
  ).filter(Boolean);

  let usersById: Record<string, { email?: string; name?: string }> = {};
  if (otherIds.length > 0) {
    const users = await db
      .collection("users")
      .find({ _id: { $in: otherIds.map((id: string) => new ObjectId(id)) } })
      .project({ email: 1, name: 1 })
      .toArray();
    usersById = Object.fromEntries(
      users.map((u: any) => [String(u._id), { email: u.email, name: u.name }])
    );
  }

  // Deduplicate friendships: if there are multiple accepted requests for the same pair,
  // keep the earliest 'since' date (friendship start).
  const friendsMap = new Map<
    string,
    { user_id: string; email?: string; name?: string; since?: Date }
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
        since,
      });
    } else if (existing.since && since && since < existing.since) {
      // Keep the earliest since date
      existing.since = since;
      friendsMap.set(otherId, existing);
    }
  }

  const friends = Array.from(friendsMap.values()).map((f) => ({
    ...f,
    // Ensure dates serialize to ISO strings
    since: f.since ? new Date(f.since).toISOString() : undefined,
  }));

  return NextResponse.json({ friends });
}
