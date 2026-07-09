import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId, type AnyBulkWriteOperation, type Db } from "mongodb";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";

type SessionParticipant = {
  user_id: string;
  joined_at?: Date | string;
  quiet?: boolean;
  [key: string]: unknown;
};

type FocusSessionDoc = {
  _id: ObjectId;
  owner_id?: string;
  session_participants?: SessionParticipant[];
};

async function detachDeletedUserFromSessions(db: Db, userId: string) {
  const sessionsCol = db.collection<FocusSessionDoc>("sessions");
  const affectedSessions = await sessionsCol
    .find(
      {
        $or: [
          { owner_id: userId },
          { "session_participants.user_id": userId },
        ],
      },
      { projection: { owner_id: 1, session_participants: 1 } },
    )
    .toArray();

  const deleteIds: ObjectId[] = [];
  const updateOps: AnyBulkWriteOperation<FocusSessionDoc>[] = [];
  const updatedAt = new Date();

  for (const session of affectedSessions) {
    const participants = Array.isArray(session.session_participants)
      ? session.session_participants
      : [];
    const remainingParticipants = participants.filter(
      (participant) => String(participant.user_id) !== userId,
    );
    const isOwner = String(session.owner_id) === userId;

    if (isOwner && remainingParticipants.length === 0) {
      deleteIds.push(session._id);
      continue;
    }

    const nextOwnerId = isOwner
      ? String(remainingParticipants[0]?.user_id)
      : session.owner_id;

    updateOps.push({
      updateOne: {
        filter: { _id: session._id },
        update: {
          $set: {
            owner_id: nextOwnerId,
            session_participants: remainingParticipants,
            participant_count: remainingParticipants.length,
            status: remainingParticipants.length >= 2 ? "booked" : "available",
            updated_at: updatedAt,
          },
        },
      },
    });
  }

  await Promise.all([
    deleteIds.length > 0
      ? sessionsCol.deleteMany({ _id: { $in: deleteIds } })
      : Promise.resolve(),
    updateOps.length > 0
      ? sessionsCol.bulkWrite(updateOps, { ordered: false })
      : Promise.resolve(),
  ]);
}

/**
 * POST /api/users/me/delete
 * Body: { confirmText: "DELETE", currentPassword?: string }
 *
 * Permanently removes the authenticated user's account along with personal
 * artifacts that reference them directly (friendships, friend requests,
 * session requests, global-chat presence). Sessions and chat messages are
 * left in place but anonymized.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(userId, "auth");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { confirmText, currentPassword } = body as {
    confirmText?: string;
    currentPassword?: string;
  };

  if (confirmText !== "DELETE") {
    return NextResponse.json(
      { error: "Type DELETE to confirm" },
      { status: 400 }
    );
  }

  const db = await getDb();
  if (!ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }
  const _id = new ObjectId(userId);
  const user = await db
    .collection<{ _id: ObjectId; hashedPassword?: string }>("users")
    .findOne({ _id });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If the account has a password, require it. Accounts created purely via an
  // OAuth flow (no hashedPassword) can proceed with just confirmText.
  if (user.hashedPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Password required" },
        { status: 400 }
      );
    }
    const ok = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!ok) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }
  }

  const deleteResult = await db.collection("users").deleteOne({ _id });
  if (deleteResult.deletedCount === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Best-effort cleanup of user-owned artifacts. Failure of any one dependent
  // collection should not block the account row deletion above.
  await Promise.allSettled([
    db.collection("friend_requests").deleteMany({
      $or: [
        { from_user_id: userId },
        { to_user_id: userId },
      ],
    }),
    db.collection("session_requests").deleteMany({
      $or: [
        { from_user_id: userId },
        { to_user_id: userId },
      ],
    }),
    db.collection("messages").deleteMany({
      $or: [
        { from_user_id: userId },
        { to_user_id: userId },
      ],
    }),
    db.collection("global_messages").updateMany(
      { user_id: userId },
      {
        $set: {
          user_id: "deleted-user",
          user_name: "Deleted user",
          username: null,
        },
      },
    ),
    db.collection("backlog_issues").deleteMany({ ownerId: userId }),
    db.collection("user_blocks").deleteMany({
      $or: [{ blocker_id: userId }, { blocked_id: userId }],
    }),
    db.collection("globalChatPresence").deleteMany({ userId: _id }),
    db.collection("accounts").deleteMany({ userId: _id }),
    detachDeletedUserFromSessions(db, userId),
  ]);

  return NextResponse.json({ ok: true });
}
