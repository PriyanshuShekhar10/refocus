import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { globalChatChannel } from "@/lib/sse";
import { publish } from "@/lib/sse";
import { publishAbly } from "@/lib/ably-server";
import {
  checkRateLimit,
  rateLimitedResponse,
  addRateLimitHeaders,
} from "@/lib/ratelimit";
import { fetchEmailVerifiedMap } from "@/lib/users/emailVerifiedMap";
import { isEmailVerified } from "@/lib/emailVerification";

/**
 * Default page size for pagination
 * Adjust based on your UI requirements
 */
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

type GlobalMessageDoc = {
  _id: unknown;
  user_id: string;
  user_name?: string | null;
  username?: string | null;
  content: string;
  created_at: Date;
  deleted?: boolean;
  deleted_at?: Date;
  edited_at?: Date;
};

/**
 * GET /api/global-chat
 *
 * Fetches global chat messages with cursor-based pagination.
 *
 * Query Parameters:
 * - cursor: ISO date string. Fetches messages BEFORE this timestamp (for loading older messages)
 * - limit: Number of messages to fetch (default: 50, max: 100)
 * - direction: "older" (default) or "newer" - direction to paginate
 *
 * Response:
 * - messages: Array of message objects
 * - nextCursor: ISO date string for the next page (null if no more messages)
 * - hasMore: Boolean indicating if more messages exist
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUserId = (
    session?.user as { id?: string; name?: string } | undefined
  )?.id;
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse pagination parameters
  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const direction = searchParams.get("direction") || "older";

  // Validate and parse limit
  let limit = DEFAULT_PAGE_SIZE;
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, MAX_PAGE_SIZE);
    }
  }

  // Parse cursor (ISO date string)
  let cursorDate: Date | null = null;
  if (cursorParam) {
    const parsed = new Date(cursorParam);
    if (!isNaN(parsed.getTime())) {
      cursorDate = parsed;
    }
  }

  const db = await getDb();

  // Build query based on cursor and direction
  type QueryType = { created_at?: { $lt?: Date; $gt?: Date } };
  const query: QueryType = {};

  if (cursorDate) {
    if (direction === "older") {
      query.created_at = { $lt: cursorDate };
    } else {
      query.created_at = { $gt: cursorDate };
    }
  }

  // Fetch one extra to determine if there are more messages
  const fetchLimit = limit + 1;

  // For "older" direction, sort descending to get the most recent of the older messages
  // For "newer" direction, sort ascending to get the oldest of the newer messages
  const sortOrder = direction === "older" ? -1 : 1;

  const docs = (await db
    .collection<GlobalMessageDoc>("global_messages")
    .find(query)
    .sort({ created_at: sortOrder })
    .limit(fetchLimit)
    .toArray()) as unknown as GlobalMessageDoc[];

  // Check if there are more messages
  const hasMore = docs.length > limit;

  // Remove the extra document used for hasMore check
  if (hasMore) {
    docs.pop();
  }

  // For "older" direction, reverse to maintain chronological order (oldest first)
  if (direction === "older") {
    docs.reverse();
  }

  const verifiedByUserId = await fetchEmailVerifiedMap(
    db,
    docs.map((m) => m.user_id),
  );

  // Determine the next cursor
  let nextCursor: string | null = null;
  if (hasMore && docs.length > 0) {
    // For older: use the oldest message's timestamp
    // For newer: use the newest message's timestamp
    const cursorDoc = direction === "older" ? docs[0] : docs[docs.length - 1];
    nextCursor = cursorDoc.created_at.toISOString();
  }

  return NextResponse.json({
    messages: docs.map((m) => ({
      id: String(m._id as string),
      user_id: m.user_id,
      user_name: m.user_name ?? null,
      username: m.username ?? null,
      emailVerified: verifiedByUserId[m.user_id] ?? false,
      content: m.content,
      created_at: m.created_at.toISOString(),
      deleted: m.deleted ?? false,
      deleted_at: m.deleted_at?.toISOString() ?? null,
      edited_at: m.edited_at?.toISOString() ?? null,
    })),
    nextCursor,
    hasMore,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as
    | { id?: string; name?: string }
    | undefined;
  const currentUserId = currentUser?.id;
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Apply rate limiting for chat messages
  const rateLimitResult = await checkRateLimit(currentUserId, "chat");
  if (!rateLimitResult.success) {
    return rateLimitedResponse(rateLimitResult);
  }

  const body = await req.json().catch(() => ({}));
  const { content } = body as { content?: string };
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Empty content" }, { status: 400 });
  }

  const db = await getDb();
  const createdAt = new Date();
  const trimmedContent = content.trim();

  // Look up the sender's username for profile linking
  const userDoc = await db.collection("users").findOne(
    { _id: new ObjectId(currentUserId) },
    { projection: { username: 1, emailVerified: 1 } },
  );
  const username = userDoc?.username ?? null;
  const emailVerified = isEmailVerified(userDoc?.emailVerified);

  const insert = await db.collection("global_messages").insertOne({
    user_id: currentUserId,
    user_name: currentUser?.name ?? null,
    username,
    content: trimmedContent,
    created_at: createdAt,
  });

  // Publish full message data for optimized client updates
  const event = {
    type: "message:new",
    payload: {
      id: String(insert.insertedId),
      user_id: currentUserId,
      user_name: currentUser?.name ?? null,
      username,
      emailVerified,
      content: trimmedContent,
      created_at: createdAt.toISOString(),
      deleted: false,
      deleted_at: null,
    },
  };
  await Promise.all([
    publish(globalChatChannel(), event),
    publishAbly(globalChatChannel(), event),
  ]);

  // Return response with rate limit headers
  const response = NextResponse.json({ id: String(insert.insertedId) });
  return addRateLimitHeaders(response, rateLimitResult);
}
