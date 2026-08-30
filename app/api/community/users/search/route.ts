import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getBlockedUserIds } from "@/lib/blocking";
import { resolveAvatarUrl } from "@/lib/userAvatar";
import {
  escapeRegex,
  userDisplayName,
} from "@/lib/communityMentions";

type SearchUser = {
  _id: ObjectId;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  image?: string | null;
  preferences?: { publicProfile?: boolean } | null;
};

function isVisibleToSearcher(
  user: SearchUser,
  userId: string,
  friendIds: Set<string>,
  blocked: Set<string>,
): boolean {
  const id = String(user._id);
  if (id === userId || blocked.has(id)) return false;
  if (friendIds.has(id)) return true;
  return user.preferences?.publicProfile !== false;
}

function buildSearchFilter(q: string): Record<string, unknown> {
  const terms = q.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return {};

  return {
    $and: terms.map((term) => ({
      $or: [
        { username: { $regex: escapeRegex(term), $options: "i" } },
        { firstname: { $regex: escapeRegex(term), $options: "i" } },
        { lastname: { $regex: escapeRegex(term), $options: "i" } },
        { name: { $regex: escapeRegex(term), $options: "i" } },
      ],
    })),
  };
}

function matchesExactLabel(user: SearchUser, q: string): boolean {
  const key = q.trim().toLowerCase();
  return (
    user.username?.toLowerCase() === key ||
    userDisplayName(user).toLowerCase() === key
  );
}

// GET /api/community/users/search?q=dev&limit=8
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const exact = searchParams.get("exact") === "1";
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "8", 10) || 8, 1),
    20,
  );

  if (!q || q.length > 40 || !/^[a-z0-9_ .'.-]+$/i.test(q)) {
    return NextResponse.json({ users: [] });
  }

  const db = await getDb();
  const blocked = await getBlockedUserIds(userId);

  type FriendAgg = { _id: string };
  const friends = (await db
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
    ])
    .toArray()) as FriendAgg[];

  const friendIds = new Set(friends.map((f) => String(f._id)));

  const candidates = (await db
    .collection("users")
    .find({
      ...buildSearchFilter(q),
      _id: { $ne: new ObjectId(userId) },
    })
    .project({
      username: 1,
      firstname: 1,
      lastname: 1,
      name: 1,
      avatar_url: 1,
      image: 1,
      preferences: 1,
    })
    .limit(exact ? 10 : 40)
    .toArray()) as SearchUser[];

  const users = candidates
    .filter((user) => isVisibleToSearcher(user, userId, friendIds, blocked))
    .filter((user) => (exact ? matchesExactLabel(user, q) : true))
    .slice(0, limit)
    .map((user) => ({
      id: String(user._id),
      username: user.username as string,
      name: userDisplayName(user),
      avatarUrl: resolveAvatarUrl(user),
    }));

  return NextResponse.json({ users });
}
