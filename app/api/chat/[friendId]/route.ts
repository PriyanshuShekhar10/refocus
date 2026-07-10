import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { chatChannel, userChannel } from "@/lib/sse";
import { broadcastEvent } from "@/lib/broadcaster";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { areFriends } from "@/lib/friendship";
import { requireVerifiedEmail } from "@/lib/requireVerifiedEmail";
import { requireNotCommunityBanned } from "@/lib/communityModeration";
import { areUsersBlocked } from "@/lib/blocking";
import { createSessionRequest } from "@/lib/sessionRequests";

type MessageDoc = {
  _id: ObjectId;
  from_user_id: string;
  to_user_id: string;
  type: "text" | "session-request" | "system";
  content?: string | null;
  payload?: {
    sessionRequestId?: string;
    start?: string;
    durationMin?: 25 | 50 | 75;
    message?: string | null;
    goal?: string | null;
    status?: "pending" | "accepted" | "declined" | "cancelled";
    from_user_id?: string;
    to_user_id?: string;
    responseMessage?: string | null;
    sessionId?: string | null;
  };
  created_at: Date;
  edited_at?: Date;
  deleted?: boolean;
  deleted_at?: Date;
};


const MAX_CHAT_TEXT_LENGTH = 2_000;

// GET /api/chat/:friendId
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> },
) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { friendId } = await params;

  if (!ObjectId.isValid(friendId)) {
    return NextResponse.json({ error: "Invalid friend id" }, { status: 400 });
  }

  if (!(await areFriends(currentUserId, friendId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getDb();
  const messages = (await db
    .collection<MessageDoc>("messages")
    .find({
      $or: [
        { from_user_id: currentUserId, to_user_id: friendId },
        { from_user_id: friendId, to_user_id: currentUserId },
      ],
    })
    .sort({ created_at: -1 })
    .limit(200)
    .toArray()) as unknown as MessageDoc[];

  // Reverse so the client receives messages in chronological order
  // (oldest-to-newest) while we fetched the newest 200 first.
  messages.reverse();

  return NextResponse.json({
    currentUserId,
    messages: messages.map((m) => ({
      id: String(m._id),
      from_user_id: m.from_user_id,
      to_user_id: m.to_user_id,
      type: m.type,
      content: m.content ?? null,
      payload: m.payload ?? null,
      created_at: m.created_at.toISOString(),
      edited_at: m.edited_at?.toISOString() ?? null,
      deleted: Boolean(m.deleted),
      deleted_at: m.deleted_at?.toISOString() ?? null,
    })),
  });
}

// POST /api/chat/:friendId
// Body:
// - { type: 'text', content }
// - { type: 'session-request', start, durationMin, message? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> },
) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailGate = await requireVerifiedEmail(currentUserId);
  if (emailGate) return emailGate;

  // Apply rate limiting for chat messages
  const rateLimitResult = await checkRateLimit(currentUserId, "chat");
  if (!rateLimitResult.success) {
    return rateLimitedResponse(rateLimitResult);
  }

  const { friendId } = await params;

  if (!ObjectId.isValid(friendId)) {
    return NextResponse.json({ error: "Invalid friend id" }, { status: 400 });
  }

  if (!(await areFriends(currentUserId, friendId))) {
    return NextResponse.json(
      { error: "You can only message friends" },
      { status: 403 },
    );
  }

  const db = await getDb();

  const body = await req.json().catch(() => ({}));
  const { type } = body as { type?: "text" | "session-request" };
  if (!type) {
    return NextResponse.json({ error: "Missing type" }, { status: 400 });
  }

  if (type === "text") {
    const { content } = body as { content?: string };
    const trimmedContent = content?.trim() ?? "";
    if (!trimmedContent) {
      return NextResponse.json({ error: "Empty content" }, { status: 400 });
    }
    if (trimmedContent.length > MAX_CHAT_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Content must be ${MAX_CHAT_TEXT_LENGTH} characters or fewer` },
        { status: 400 },
      );
    }
    const createdAt = new Date();
    const insert = await db.collection("messages").insertOne({
      from_user_id: currentUserId,
      to_user_id: friendId,
      type: "text",
      content: trimmedContent,
      created_at: createdAt,
      read_at: null,
      deleted: false,
    });

    // Publish events (async for Redis support)
    // Include the full message in the payload so clients can append
    // directly instead of re-fetching the entire conversation.
    const channel = chatChannel(currentUserId, friendId);
    const newMsg = {
      id: String(insert.insertedId),
      from_user_id: currentUserId,
      to_user_id: friendId,
      type: "text" as const,
      content: trimmedContent,
      payload: null,
      created_at: createdAt.toISOString(),
    };
    await Promise.all([
      broadcastEvent(channel, {
        type: "message:new",
        payload: newMsg,
      }),
      broadcastEvent(userChannel(friendId), {
        type: "unread:inc",
        payload: { friendId: currentUserId, delta: 1 },
      }),
    ]);

    return NextResponse.json({ id: String(insert.insertedId) });
  }

  if (type === "session-request") {
    const banGate = await requireNotCommunityBanned(currentUserId);
    if (banGate) return banGate;

    if (await areUsersBlocked(currentUserId, friendId)) {
      return NextResponse.json(
        { error: "You cannot send session requests to this user" },
        { status: 403 },
      );
    }

    const { start, durationMin, message, goal } = body as {
      start?: string;
      durationMin?: number;
      message?: string;
      goal?: string;
    };

    if (!start || typeof durationMin !== "number") {
      return NextResponse.json(
        { error: "Missing start or durationMin" },
        { status: 400 },
      );
    }

    try {
      const { id, sessionRequestId } = await createSessionRequest({
        db,
        currentUserId,
        friendId,
        start,
        durationMin,
        message,
        goal,
      });
      return NextResponse.json({ id, sessionRequestId });
    } catch (err) {
      const msg = (err as Error).message;
      const status = msg.includes("already exists") || msg.includes("already have a session") ? 409 : 400;
      return NextResponse.json({ error: msg }, { status });
    }
  }

  return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
}
