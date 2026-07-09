import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { requireVerifiedEmail } from "@/lib/requireVerifiedEmail";
import { resolveAvatarUrl } from "@/lib/userAvatar";
import { areUsersBlocked } from "@/lib/blocking";

type FriendRequestDoc = {
  _id: ObjectId;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: Date;
};

type UserDoc = {
  _id: ObjectId;
  email?: string;
  name?: string;
};

// POST /api/friends/requests { to_user_id }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const emailGate = await requireVerifiedEmail(currentUserId);
  if (emailGate) return emailGate;


  // Rate limit friend request creation
  const rl = await checkRateLimit(currentUserId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { to_user_id } = body as { to_user_id?: string };
  if (!to_user_id)
    return NextResponse.json({ error: "Missing to_user_id" }, { status: 400 });
  if (!ObjectId.isValid(to_user_id))
    return NextResponse.json({ error: "Invalid to_user_id" }, { status: 400 });
  if (to_user_id === currentUserId)
    return NextResponse.json(
      { error: "Cannot friend yourself" },
      { status: 400 }
    );
  const db = await getDb();

  const recipient = await db
    .collection("users")
    .findOne({ _id: new ObjectId(to_user_id) }, { projection: { _id: 1 } });
  if (!recipient) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (await areUsersBlocked(currentUserId, to_user_id)) {
    return NextResponse.json(
      { error: "You cannot send a friend request to this user" },
      { status: 403 },
    );
  }

  const accepted = await db.collection("friend_requests").findOne({
    $or: [
      { from_user_id: currentUserId, to_user_id, status: "accepted" },
      { from_user_id: to_user_id, to_user_id: currentUserId, status: "accepted" },
    ],
  });
  if (accepted) {
    return NextResponse.json({ ok: true, alreadyFriends: true });
  }

  const reverse = await db.collection("friend_requests").findOne({
    from_user_id: to_user_id,
    to_user_id: currentUserId,
    status: "pending",
  });
  if (reverse) {
    return NextResponse.json(
      { error: "This user already sent you a friend request" },
      { status: 409 }
    );
  }

  const result = await db.collection("friend_requests").updateOne(
    {
      from_user_id: currentUserId,
      to_user_id,
      status: "pending",
    },
    {
      $setOnInsert: {
        from_user_id: currentUserId,
        to_user_id,
        status: "pending",
        created_at: new Date(),
      },
    },
    { upsert: true }
  );

  return NextResponse.json({
    ok: true,
    alreadyPending: result.upsertedCount === 0,
  });
}

// GET /api/friends/requests?type=incoming|outgoing
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUserId2 = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId2)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "incoming";
  const status = searchParams.get("status"); // optional: filter by status

  const column = type === "outgoing" ? "from_user_id" : "to_user_id";
  const db = await getDb();
  const match: Partial<Pick<FriendRequestDoc, "from_user_id" | "to_user_id" | "status">> & Record<string, string> =
    { [column]: currentUserId2! } as Record<string, string>;
  if (status) match.status = status;

  const data = await db
    .collection<FriendRequestDoc>("friend_requests")
    .find(match)
    .sort({ created_at: -1 })
    .toArray();

  // Collect other party userIds to lookup emails in one query
  const otherIds = Array.from(
    new Set(
      data.map((d) => (type === "outgoing" ? d.to_user_id : d.from_user_id))
    )
  ).filter((id): id is string => Boolean(id) && ObjectId.isValid(id));

  let usersById: Record<
    string,
    { email?: string; name?: string; avatarUrl?: string | null }
  > = {};
  if (otherIds.length > 0) {
    const users = await db
      .collection<UserDoc & { avatar_url?: string | null; image?: string | null }>(
        "users",
      )
      .find({ _id: { $in: otherIds.map((id: string) => new ObjectId(id)) } })
      .project({ email: 1, name: 1, avatar_url: 1, image: 1 })
      .toArray();
    usersById = Object.fromEntries(
      users.map((u) => [
        String(u._id),
        {
          email: u.email,
          name: u.name,
          avatarUrl: resolveAvatarUrl(u),
        },
      ]),
    );
  }

  const requests = data.map((d) => {
    const from = usersById[d.from_user_id] || {};
    const to = usersById[d.to_user_id] || {};
    return {
      id: String(d._id),
      from_user_id: d.from_user_id,
      to_user_id: d.to_user_id,
      from_user_email: from.email || undefined,
      to_user_email: to.email || undefined,
      from_user_avatar_url: from.avatarUrl ?? null,
      to_user_avatar_url: to.avatarUrl ?? null,
      status: d.status,
      created_at: d.created_at,
    };
  });
  return NextResponse.json({ requests });
}
