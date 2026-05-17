import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { publish, sessionsChannel } from "@/lib/sse";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { DURATION_OPTIONS, SESSION_TYPES, type DurationMin, type SessionType } from "@/constants/calendar";
import { hasSessionOverlap } from "@/lib/sessionOverlap";

// GET /api/sessions?from=ISO&to=ISO
type DbSession = {
  _id: ObjectId;
  owner_id: string;
  start_time: Date;
  end_time: Date;
  duration_min: 25 | 50 | 75;
  session_type: "focus" | "deep-work" | "learning";
  status?: string;
  name?: string | null;
  color?: string | null;
  session_participants?: Array<{
    user_id: string;
    joined_at: Date | string;
    quiet?: boolean;
  }>;
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  type AuthUser = { id?: string };
  const userId = (session?.user as AuthUser | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Basic validation
  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing from/to query params (ISO datetime)" },
      { status: 400 },
    );
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid from/to query params" },
      { status: 400 },
    );
  }

  // Fetch sessions in range, pushing visibility filter into the DB query.
  // Visibility rule: sessions with < 2 participants are visible to everyone;
  // fully-booked sessions (>= 2 participants) are only visible to
  // their owner or participants.
  const db = await getDb();
  const col = db.collection<DbSession>("sessions");
  const sessions: DbSession[] = (await col
    .find({
      start_time: { $gte: fromDate, $lt: toDate },
      $or: [
        // Not fully booked (fewer than 2 participants)
        {
          $expr: {
            $lt: [
              { $size: { $ifNull: ["$session_participants", []] } },
              2,
            ],
          },
        },
        // Current user is the session owner
        { owner_id: userId },
        // Current user is a participant
        { "session_participants.user_id": userId },
      ],
    })
    .sort({ start_time: 1 })
    .toArray()) as unknown as DbSession[];

  // Collect unique user IDs (owner + participants) to hydrate with user profile info
  const userIdSet = new Set<string>();
  (sessions ?? []).forEach((s) => {
    if (s.owner_id) userIdSet.add(String(s.owner_id));
    (s.session_participants ?? []).forEach((p) =>
      userIdSet.add(String(p.user_id)),
    );
  });

  type DbUser = {
    _id: ObjectId;
    name?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    email?: string | null;
    username?: string | null;
    about?: string | null;
    image?: string | null;
  };

  let usersById: Record<
    string,
    {
      id: string;
      email?: string | null;
      firstname?: string | null;
      lastname?: string | null;
      username?: string | null;
      about?: string | null;
      avatar_url?: string | null;
    }
  > = {};
  if (userIdSet.size > 0) {
    const ids = Array.from(userIdSet).filter((id) => ObjectId.isValid(id));
    if (ids.length > 0) {
      const users = (await db
        .collection<DbUser>("users")
        .find({ _id: { $in: ids.map((i) => new ObjectId(i)) } })
        .project({
          name: 1,
          firstname: 1,
          lastname: 1,
          email: 1,
          username: 1,
          about: 1,
          image: 1,
        })
        .toArray()) as unknown as DbUser[];
      usersById = Object.fromEntries(
        users.map((u) => [
          String(u._id),
          {
            id: String(u._id),
            email: u.email ?? null,
            firstname:
              u.firstname ?? (u.name ? String(u.name).split(" ")[0] : null),
            lastname: u.lastname ?? null,
            username: u.username ?? null,
            about: u.about ?? null,
            avatar_url: u.image ?? null,
          },
        ]),
      );
    }
  }

  const now = new Date();
  const mapped = (sessions ?? []).map((s) => {
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    const count = (s.session_participants?.length ?? 0) as number;
    // Compute status deterministically from time and participants
    let status: "available" | "booked" | "in-progress" | "completed";
    if (now > end) status = "completed";
    else if (now >= start && now <= end) status = "in-progress";
    else if (count >= 2) status = "booked";
    else status = "available";

    return {
      id: String(s._id),
      owner_id: s.owner_id,
      start: start.toISOString(),
      end: end.toISOString(),
      durationMin: s.duration_min as 25 | 50 | 75,
      sessionType: s.session_type as "focus" | "deep-work" | "learning",
      name: s.name ?? null,
      color: s.color ?? null,
      participants: (s.session_participants ?? []).map((p) => ({
        user_id: p.user_id,
        joined_at: String(p.joined_at),
        email: usersById[p.user_id]?.email ?? undefined,
        firstname: usersById[p.user_id]?.firstname ?? undefined,
        lastname: usersById[p.user_id]?.lastname ?? undefined,
        username: usersById[p.user_id]?.username ?? undefined,
        about: usersById[p.user_id]?.about ?? undefined,
        avatar_url: usersById[p.user_id]?.avatar_url ?? undefined,
        quiet: Boolean(p.quiet),
      })),
      owner: usersById[s.owner_id] ?? null,
      status,
    };
  });

  return NextResponse.json({ currentUserId: userId, sessions: mapped });
}

// Maximum days in the future a session can be booked
const MAX_BOOKING_HORIZON_DAYS = 90;

// POST /api/sessions
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit session creation
  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { start, durationMin, sessionType, quietOwner } = body as {
    start?: string;
    durationMin?: number;
    sessionType?: string;
    quietOwner?: boolean;
  };
  if (!start || typeof durationMin !== "number" || !sessionType) {
    return NextResponse.json(
      { error: "Missing start, durationMin, or sessionType" },
      { status: 400 },
    );
  }
  if (!DURATION_OPTIONS.includes(durationMin as DurationMin)) {
    return NextResponse.json(
      { error: `Invalid durationMin (allowed: ${DURATION_OPTIONS.join(", ")})` },
      { status: 400 },
    );
  }
  if (!SESSION_TYPES.includes(sessionType as SessionType)) {
    return NextResponse.json(
      { error: `Invalid sessionType (allowed: ${SESSION_TYPES.join(", ")})` },
      { status: 400 },
    );
  }
  const s = new Date(start);
  if (isNaN(s.getTime())) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }

  // Block past or current sessions
  const now = new Date();
  if (s.getTime() <= now.getTime()) {
    return NextResponse.json(
      { error: "Cannot book a session in the past or for current time" },
      { status: 400 },
    );
  }

  // Block sessions too far in the future (defense against abuse + accidental drift)
  const maxFuture = new Date(now.getTime() + MAX_BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000);
  if (s.getTime() > maxFuture.getTime()) {
    return NextResponse.json(
      { error: `Cannot book a session more than ${MAX_BOOKING_HORIZON_DAYS} days in advance` },
      { status: 400 },
    );
  }

  const e = new Date(s.getTime() + durationMin * 60_000);

  // Server-side overlap check so a malicious or buggy client can't double-book.
  const db = await getDb();
  if (await hasSessionOverlap(db, userId, s, e)) {
    return NextResponse.json(
      { error: "You already have a session during this time" },
      { status: 409 },
    );
  }

  const insert = await db.collection("sessions").insertOne({
    owner_id: userId,
    start_time: s,
    end_time: e,
    duration_min: durationMin as DurationMin,
    session_type: sessionType as SessionType,
    status: "available",
    session_participants: [
      { user_id: userId, joined_at: new Date(), quiet: Boolean(quietOwner) },
    ],
    created_at: new Date(),
    updated_at: new Date(),
  });
  await publish(sessionsChannel(), { type: "sessions_updated" });
  return NextResponse.json({ id: String(insert.insertedId) });
}
