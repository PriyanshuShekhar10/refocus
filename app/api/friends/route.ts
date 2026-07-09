import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { resolveAvatarUrl } from "@/lib/userAvatar";
import { ADMIN_ROLE } from "@/lib/admin";

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

  // Use aggregation to extract & deduplicate friend IDs at the DB level
  // instead of loading all accepted friend_requests into memory.
  type FriendAggResult = { _id: string; since: Date };
  const pipeline: Record<string, unknown>[] = [
    {
      $match: {
        status: "accepted",
        $or: [{ from_user_id: userId }, { to_user_id: userId }],
      },
    },
    {
      $project: {
        friendId: {
          $cond: {
            if: { $eq: ["$from_user_id", userId] },
            then: "$to_user_id",
            else: "$from_user_id",
          },
        },
        since: {
          $ifNull: ["$responded_at", { $ifNull: ["$updated_at", "$created_at"] }],
        },
      },
    },
    // Deduplicate: keep earliest friendship date per friend
    {
      $group: {
        _id: "$friendId",
        since: { $min: "$since" },
      },
    },
    { $sort: { _id: 1 } },
  ];

  // Apply cursor: skip everything up to and including the cursor value
  if (cursor) {
    pipeline.push({ $match: { _id: { $gt: cursor } } });
  }

  // Fetch one extra to determine hasMore
  pipeline.push({ $limit: limit + 1 });

  const aggResult = (await db
    .collection("friend_requests")
    .aggregate(pipeline)
    .toArray()) as FriendAggResult[];

  const hasMore = aggResult.length > limit;
  const pageItems = hasMore ? aggResult.slice(0, limit) : aggResult;

  const otherIds = pageItems
    .map((r) => r._id)
    .filter((id): id is string => Boolean(id) && ObjectId.isValid(id));

  let usersById: Record<
    string,
    {
      email?: string;
      name?: string;
      username?: string;
      avatarUrl?: string | null;
      isAdmin?: boolean;
    }
  > = {};
  if (otherIds.length > 0) {
    const users = await db
      .collection<{
        _id: ObjectId;
        email?: string;
        name?: string;
        username?: string;
        avatar_url?: string | null;
        image?: string | null;
        role?: string | null;
      }>("users")
      .find({ _id: { $in: otherIds.map((id: string) => new ObjectId(id)) } })
      .project({ email: 1, name: 1, username: 1, avatar_url: 1, image: 1, role: 1 })
      .toArray();
    usersById = Object.fromEntries(
      users.map((u) => [
        String(u._id),
        {
          email: u.email,
          name: u.name,
          username: u.username,
          avatarUrl: resolveAvatarUrl(u),
          isAdmin: u.role === ADMIN_ROLE,
        },
      ]),
    );
  }

  const friends = pageItems.map((r) => {
    const user = usersById[r._id] || {};
    return {
      user_id: r._id,
      email: user.email || undefined,
      name: user.name || undefined,
      username: user.username || undefined,
      avatarUrl: user.avatarUrl ?? null,
      isAdmin: user.isAdmin ?? false,
      since: r.since ? new Date(r.since).toISOString() : undefined,
    };
  });

  const nextCursor = hasMore
    ? pageItems[pageItems.length - 1]?._id ?? null
    : null;

  // Count total friends (lightweight — just count docs, not load them)
  const totalResult = (await db
    .collection("friend_requests")
    .aggregate([
      {
        $match: {
          status: "accepted",
          $or: [{ from_user_id: userId }, { to_user_id: userId }],
        },
      },
      {
        $project: {
          friendId: {
            $cond: {
              if: { $eq: ["$from_user_id", userId] },
              then: "$to_user_id",
              else: "$from_user_id",
            },
          },
        },
      },
      { $group: { _id: "$friendId" } },
      { $count: "total" },
    ])
    .toArray()) as { total: number }[];
  const total = totalResult[0]?.total ?? 0;

  return NextResponse.json({ friends, nextCursor, total });
}
