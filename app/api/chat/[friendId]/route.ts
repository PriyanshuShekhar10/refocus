import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { chatChannel, publish, userChannel } from "@/lib/sse";
import {
  checkRateLimit,
  rateLimitedResponse,
  addRateLimitHeaders,
} from "@/lib/ratelimit";

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
    status?: "pending" | "accepted" | "declined" | "cancelled";
    from_user_id?: string;
    to_user_id?: string;
    responseMessage?: string | null;
    sessionId?: string | null;
  };
  created_at: Date;
};

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
  const db = await getDb();
  const messages = (await db
    .collection<MessageDoc>("messages")
    .find({
      $or: [
        { from_user_id: currentUserId, to_user_id: friendId },
        { from_user_id: friendId, to_user_id: currentUserId },
      ],
    })
    .sort({ created_at: 1 })
    .limit(200)
    .toArray()) as unknown as MessageDoc[];

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

  // Apply rate limiting for chat messages
  const rateLimitResult = await checkRateLimit(currentUserId, "chat");
  if (!rateLimitResult.success) {
    return rateLimitedResponse(rateLimitResult);
  }

  const { friendId } = await params;
  const db = await getDb();

  const body = await req.json().catch(() => ({}));
  const { type } = body as { type?: "text" | "session-request" };
  if (!type) {
    return NextResponse.json({ error: "Missing type" }, { status: 400 });
  }

  if (type === "text") {
    const { content } = body as { content?: string };
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Empty content" }, { status: 400 });
    }
    const insert = await db.collection("messages").insertOne({
      from_user_id: currentUserId,
      to_user_id: friendId,
      type: "text",
      content,
      created_at: new Date(),
      read_at: null,
    });

    // Publish events (async for Redis support)
    const channel = chatChannel(currentUserId, friendId);
    await Promise.all([
      publish(channel, {
        type: "message:new",
        payload: { id: String(insert.insertedId) },
      }),
      publish(userChannel(friendId), {
        type: "unread:inc",
        payload: { friendId: currentUserId, delta: 1 },
      }),
    ]);

    return NextResponse.json({ id: String(insert.insertedId) });
  }

  if (type === "session-request") {
    const { start, durationMin, message } = body as {
      start?: string;
      durationMin?: 25 | 50 | 75;
      message?: string;
    };
    if (!start || !durationMin)
      return NextResponse.json(
        { error: "Missing start or durationMin" },
        { status: 400 },
      );
    const s = new Date(start);
    if (isNaN(s.getTime()))
      return NextResponse.json({ error: "Invalid start" }, { status: 400 });

    // Create session request
    const sr = await db.collection("session_requests").insertOne({
      from_user_id: currentUserId,
      to_user_id: friendId,
      start_time: s,
      duration_min: durationMin,
      message: message ?? null,
      response_message: null,
      status: "pending",
      created_at: new Date(),
      responded_at: null,
    });

    // Create chat message that references the session request
    const insert = await db.collection("messages").insertOne({
      from_user_id: currentUserId,
      to_user_id: friendId,
      type: "session-request",
      content: null,
      payload: {
        sessionRequestId: String(sr.insertedId),
        start: s.toISOString(),
        durationMin,
        message: message ?? null,
        status: "pending",
        from_user_id: currentUserId,
        to_user_id: friendId,
      },
      created_at: new Date(),
      read_at: null,
    });

    // Publish events (async for Redis support)
    const channel = chatChannel(currentUserId, friendId);
    await Promise.all([
      publish(channel, {
        type: "session-request:new",
        payload: {
          messageId: String(insert.insertedId),
          sessionRequestId: String(sr.insertedId),
        },
      }),
      publish(userChannel(friendId), {
        type: "unread:inc",
        payload: { friendId: currentUserId, delta: 1 },
      }),
    ]);

    return NextResponse.json({
      id: String(insert.insertedId),
      sessionRequestId: String(sr.insertedId),
    });
  }

  return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
}
