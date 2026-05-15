import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { areFriends } from "@/lib/friendship";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { DURATION_OPTIONS, type DurationMin } from "@/constants/calendar";
import { hasSessionOverlap } from "@/lib/sessionOverlap";

type SessionRequestDoc = {
  _id: ObjectId;
  from_user_id: string;
  to_user_id: string;
  start_time: Date;
  duration_min: 25 | 50 | 75;
  message?: string | null;
  response_message?: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: Date;
  responded_at?: Date | null;
};

type UserDoc = {
  _id: ObjectId;
  email?: string;
  name?: string | null;
};

const MAX_BOOKING_HORIZON_DAYS = 90;

// POST /api/session-requests
// Body: { to_user_id, start: ISO string, durationMin: 25|50|75, message?: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit – session requests are user-facing notifications, so should be bounded.
  const rl = await checkRateLimit(currentUserId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { to_user_id, start, durationMin, message } = body as {
    to_user_id?: string;
    start?: string;
    durationMin?: number;
    message?: string;
  };

  if (!to_user_id || !start || typeof durationMin !== "number")
    return NextResponse.json(
      { error: "Missing to_user_id, start, or durationMin" },
      { status: 400 }
    );
  if (!ObjectId.isValid(to_user_id)) {
    return NextResponse.json({ error: "Invalid to_user_id" }, { status: 400 });
  }
  if (to_user_id === currentUserId)
    return NextResponse.json({ error: "Cannot request yourself" }, { status: 400 });
  if (!DURATION_OPTIONS.includes(durationMin as DurationMin)) {
    return NextResponse.json(
      { error: `Invalid durationMin (allowed: ${DURATION_OPTIONS.join(", ")})` },
      { status: 400 },
    );
  }

  const s = new Date(start);
  if (isNaN(s.getTime()))
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });

  const now = new Date();
  if (s.getTime() <= now.getTime()) {
    return NextResponse.json(
      { error: "Cannot book a session in the past or current time" },
      { status: 400 }
    );
  }
  const maxFuture = new Date(now.getTime() + MAX_BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000);
  if (s.getTime() > maxFuture.getTime()) {
    return NextResponse.json(
      { error: `Cannot book a session more than ${MAX_BOOKING_HORIZON_DAYS} days in advance` },
      { status: 400 },
    );
  }

  const db = await getDb();

  // Recipient must exist (prevents enumeration noise / orphan requests).
  const recipient = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(to_user_id) },
      { projection: { _id: 1 } },
    );
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  // Only friends can send each other session requests. Mirrors the chat path.
  if (!(await areFriends(currentUserId, to_user_id))) {
    return NextResponse.json(
      { error: "You can only send session requests to friends" },
      { status: 403 },
    );
  }

  const end = new Date(s.getTime() + durationMin * 60_000);

  // Calendar conflict — for the sender, hard-block. For the recipient, hard-block
  // too: there's no point queuing a request the recipient can't accept anyway.
  if (await hasSessionOverlap(db, currentUserId, s, end)) {
    return NextResponse.json(
      { error: "You already have a session during this time" },
      { status: 409 },
    );
  }
  if (await hasSessionOverlap(db, to_user_id, s, end)) {
    return NextResponse.json(
      { error: "Recipient already has a session during this time" },
      { status: 409 },
    );
  }

  // Prevent spamming duplicate pending requests for the same slot.
  const existing = await db.collection("session_requests").findOne({
    from_user_id: currentUserId,
    to_user_id,
    start_time: s,
    duration_min: durationMin,
    status: "pending",
  });
  if (existing) {
    return NextResponse.json(
      { error: "A pending request for this slot already exists" },
      { status: 409 },
    );
  }

  const insert = await db.collection("session_requests").insertOne({
    from_user_id: currentUserId,
    to_user_id,
    start_time: s,
    duration_min: durationMin as DurationMin,
    message: message ? String(message).slice(0, 500) : null,
    response_message: null,
    status: "pending",
    created_at: new Date(),
    responded_at: null,
  });
  return NextResponse.json({ ok: true, id: String(insert.insertedId) });
}

// GET /api/session-requests?type=incoming|outgoing&status=pending|accepted|declined
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "incoming";
  const status = searchParams.get("status") || undefined;
  const column = type === "outgoing" ? "from_user_id" : "to_user_id";

  const db = await getDb();
  const match: Partial<Pick<SessionRequestDoc, "from_user_id" | "to_user_id" | "status">> & Record<string, string> =
    { [column]: currentUserId } as Record<string, string>;
  if (status) match.status = status as SessionRequestDoc["status"];

  const data = (await db
    .collection<SessionRequestDoc>("session_requests")
    .find(match)
    .sort({ created_at: -1 })
    .toArray()) as unknown as SessionRequestDoc[];

  const otherIds = Array.from(
    new Set(
      data.map((d) => (type === "outgoing" ? d.to_user_id : d.from_user_id))
    )
  ).filter((id): id is string => Boolean(id) && ObjectId.isValid(id));

  let usersById: Record<string, { email?: string; name?: string | null }> = {};
  if (otherIds.length > 0) {
    const users = await db
      .collection<UserDoc>("users")
      .find({ _id: { $in: otherIds.map((id: string) => new ObjectId(id)) } })
      .project({ email: 1, name: 1 })
      .toArray();
    usersById = Object.fromEntries(
      users.map((u) => [String(u._id), { email: u.email, name: u.name ?? null }])
    );
  }

  const requests = data.map((d) => {
    const from = usersById[d.from_user_id] || {};
    const to = usersById[d.to_user_id] || {};
    return {
      id: String(d._id),
      from_user_id: d.from_user_id,
      to_user_id: d.to_user_id,
      from_user_email: from.email,
      to_user_email: to.email,
      start: d.start_time.toISOString(),
      durationMin: d.duration_min,
      message: d.message ?? null,
      responseMessage: d.response_message ?? null,
      status: d.status,
      created_at: d.created_at,
      responded_at: d.responded_at ?? null,
    };
  });

  return NextResponse.json({ requests });
}
