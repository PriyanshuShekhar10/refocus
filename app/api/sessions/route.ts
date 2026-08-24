import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { publishSessionDocUpserted } from "@/lib/sessionRealtime";
import { isEmailVerified } from "@/lib/emailVerification";
import { DURATION_OPTIONS, SESSION_TYPES, BOOKING_TIME_STEP_MINUTES, isBookingStartAligned, type DurationMin, type SessionType } from "@/constants/calendar";
import { hasSessionOverlap } from "@/lib/sessionOverlap";
import { requireVerifiedEmail } from "@/lib/requireVerifiedEmail";
import { requireNotCommunityBanned } from "@/lib/communityModeration";
import { getBlockedUserIds } from "@/lib/blocking";
import { resolveSessionDisplayName } from "@/lib/sessionPersonalization";
import { scheduleRecordAccessIp } from "@/lib/userIps";
import { isEngagementCrewUserId } from "@/lib/engagementCrew";

// GET /api/sessions?from=ISO&to=ISO
// GET /api/sessions?mineUpcoming=1  — caller's future/in-progress sessions only
/** Soft cap on open (bookable) slots returned per range request. */
const MAX_OPEN_SLOTS = 200;
/** Soft cap on booked sessions used for calendar occupancy chips. */
const MAX_OCCUPIED_SLOTS = 200;
/**
 * TEMPORARY: engagement crew cannot open a new session starting sooner than this.
 * Remove when the temporary crew scheduling rule ends.
 */
const CREW_MIN_LEAD_MS = 60 * 60 * 1000;

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
  participant_count?: number;
  session_participants?: Array<{
    user_id: string;
    joined_at: Date | string;
    quiet?: boolean;
    label?: string | null;
  }>;
};

function participantCount(s: DbSession): number {
  if (typeof s.participant_count === "number") return s.participant_count;
  return s.session_participants?.length ?? 0;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  type AuthUser = { id?: string };
  const userId = (session?.user as AuthUser | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  scheduleRecordAccessIp(req, userId);

  const { searchParams } = new URL(req.url);
  const mineUpcoming = searchParams.get("mineUpcoming") === "1";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const now = new Date();
  const db = await getDb();
  const col = db.collection<DbSession>("sessions");

  /** Soft cap for the dashboard "Upcoming" sidebar (all future sessions). */
  const MAX_MINE_UPCOMING = 100;

  let sessions: DbSession[];
  let occupiedDocs: Array<DbSession & { _originalId?: ObjectId }> = [];

  if (mineUpcoming) {
    // User's own future/in-progress sessions across the full horizon (not
    // scoped to the visible calendar week). Used by the left sidebar.
    sessions = await col
      .find({
        end_time: { $gte: now },
        $or: [
          { owner_id: userId },
          { "session_participants.user_id": userId },
        ],
      })
      .sort({ start_time: 1 })
      .limit(MAX_MINE_UPCOMING)
      .toArray();
  } else {
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

    const bookableFrom = new Date(Math.max(fromDate.getTime(), now.getTime()));

    // Two index-friendly queries:
    // A) open bookable slots that have not started yet (participant_count < 2)
    // B) current user's sessions (including fully booked / in-progress)
    const myRangeFilter = { start_time: { $gte: fromDate, $lt: toDate } };

    const [openSlots, mySessions, bookedSlots, binnedSlots] = await Promise.all([
      bookableFrom < toDate
        ? col
            .find({
              start_time: { $gt: now, $gte: fromDate, $lt: toDate },
              // Prefer participant_count; include legacy docs missing the field
              // that still have fewer than 2 participants.
              $or: [
                { participant_count: { $lt: 2 } },
                {
                  participant_count: { $exists: false },
                  $or: [
                    { session_participants: { $exists: false } },
                    { "session_participants.1": { $exists: false } },
                  ],
                },
              ],
            })
            .sort({ start_time: 1 })
            .limit(MAX_OPEN_SLOTS)
            .toArray()
        : Promise.resolve([]),
      col
        .find({
          ...myRangeFilter,
          $or: [
            { owner_id: userId },
            { "session_participants.user_id": userId },
          ],
        })
        .sort({ start_time: 1 })
        .toArray(),
      // Booked sessions for occupancy chips (privacy-safe avatars only in response).
      // Includes past completed matches so hours show "attended".
      col
        .find({
          start_time: { $gte: fromDate, $lt: toDate },
          $or: [
            { participant_count: { $gte: 2 } },
            { "session_participants.1": { $exists: true } },
          ],
        })
        .sort({ start_time: 1 })
        .limit(MAX_OCCUPIED_SLOTS)
        .toArray(),
      // Archived past sessions (moved out of live collection by bin script).
      db
        .collection<DbSession & { _originalId?: ObjectId }>("sessions_bin")
        .find({
          start_time: { $gte: fromDate, $lt: toDate },
          $or: [
            { participant_count: { $gte: 2 } },
            { "session_participants.1": { $exists: true } },
          ],
        })
        .sort({ start_time: 1 })
        .limit(MAX_OCCUPIED_SLOTS)
        .toArray(),
    ]);

    const byId = new Map<string, DbSession>();
    for (const s of openSlots) byId.set(String(s._id), s);
    for (const s of mySessions) byId.set(String(s._id), s);
    sessions = Array.from(byId.values()).sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

    const occupiedById = new Map<string, DbSession & { _originalId?: ObjectId }>();
    for (const s of bookedSlots) {
      if (participantCount(s) >= 2) occupiedById.set(String(s._id), s);
    }
    for (const s of binnedSlots) {
      if (participantCount(s) < 2) continue;
      const id = String(s._originalId ?? s._id);
      if (!occupiedById.has(id)) occupiedById.set(id, s);
    }
    occupiedDocs = Array.from(occupiedById.values())
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      )
      .slice(0, MAX_OCCUPIED_SLOTS);
  }

  const blockedIds = await getBlockedUserIds(userId);
  if (blockedIds.size > 0) {
    sessions = sessions.filter((s) => {
      if (s.owner_id === userId) return true;
      if (
        (s.session_participants ?? []).some(
          (p) => String(p.user_id) === userId,
        )
      ) {
        return true;
      }
      return !blockedIds.has(String(s.owner_id));
    });
    occupiedDocs = occupiedDocs.filter((s) => {
      if (blockedIds.has(String(s.owner_id))) return false;
      const parts = s.session_participants ?? [];
      return !parts.some((p) => blockedIds.has(String(p.user_id)));
    });
  }

  // Collect unique user IDs (owner + participants) to hydrate with user profile info
  const userIdSet = new Set<string>();
  (sessions ?? []).forEach((s) => {
    if (s.owner_id) userIdSet.add(String(s.owner_id));
    (s.session_participants ?? []).forEach((p) =>
      userIdSet.add(String(p.user_id)),
    );
  });
  for (const s of occupiedDocs) {
    (s.session_participants ?? []).forEach((p) =>
      userIdSet.add(String(p.user_id)),
    );
  }

  type DbUser = {
    _id: ObjectId;
    name?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    email?: string | null;
    username?: string | null;
    about?: string | null;
    image?: string | null;
    avatar_url?: string | null;
    emailVerified?: Date | string | null;
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
      emailVerified: boolean;
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
          avatar_url: 1,
          emailVerified: 1,
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
            avatar_url: u.avatar_url ?? u.image ?? null,
            emailVerified: isEmailVerified(u.emailVerified),
          },
        ]),
      );
    }
  }

  const mapped = sessions.map((s) => {
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    const count = participantCount(s);
    // Compute status deterministically from time and participants
    let status: "available" | "booked" | "in-progress" | "completed";
    if (now > end) status = "completed";
    else if (now >= start && now <= end) status = "in-progress";
    else if (count >= 2) status = "booked";
    else status = "available";

    const owner = usersById[s.owner_id];
    return {
      id: String(s._id),
      owner_id: s.owner_id,
      start: start.toISOString(),
      end: end.toISOString(),
      durationMin: s.duration_min as 25 | 50 | 75,
      sessionType: s.session_type as "focus" | "deep-work" | "learning",
      name: resolveSessionDisplayName(s, userId),
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
        emailVerified: usersById[p.user_id]?.emailVerified ?? false,
        quiet: Boolean(p.quiet),
      })),
      owner: owner
        ? {
            id: owner.id,
            email: owner.email ?? undefined,
            firstname: owner.firstname ?? undefined,
            lastname: owner.lastname ?? undefined,
            username: owner.username ?? undefined,
            about: owner.about ?? undefined,
            avatar_url: owner.avatar_url ?? undefined,
            emailVerified: owner.emailVerified,
          }
        : null,
      status,
    };
  });

  const occupied = occupiedDocs.map((s) => {
    const people = (s.session_participants ?? [])
      .slice(0, 2)
      .map((p) => {
        const u = usersById[p.user_id];
        const first = u?.firstname?.trim() || u?.username?.trim() || "";
        const last = u?.lastname?.trim() || "";
        const initials =
          `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() ||
          (u?.username?.slice(0, 2).toUpperCase() ?? "?");
        return {
          id: p.user_id,
          avatarUrl: u?.avatar_url ?? null,
          initials,
        };
      });
    const binned = s as DbSession & { _originalId?: ObjectId };
    return {
      id: String(binned._originalId ?? s._id),
      start: new Date(s.start_time).toISOString(),
      end: new Date(s.end_time).toISOString(),
      participantCount: participantCount(s),
      people,
    };
  });

  return NextResponse.json({
    currentUserId: userId,
    sessions: mapped,
    occupied,
  });
}

// Maximum days in the future a session can be booked
const MAX_BOOKING_HORIZON_DAYS = 90;

// POST /api/sessions
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const emailGate = await requireVerifiedEmail(userId);
  if (emailGate) return emailGate;

  const banGate = await requireNotCommunityBanned(userId);
  if (banGate) return banGate;

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
  if (!isBookingStartAligned(s)) {
    return NextResponse.json(
      {
        error: `Start time must be on a ${BOOKING_TIME_STEP_MINUTES}-minute mark (:00 or :30)`,
      },
      { status: 400 },
    );
  }

  // Block past or current sessions
  const now = new Date();
  if (s.getTime() <= now.getTime()) {
    return NextResponse.json(
      { error: "Cannot book a session in the past or for current time" },
      { status: 400 },
    );
  }

  // TEMPORARY: engagement crew scheduling limits.
  if (await isEngagementCrewUserId(userId)) {
    if (durationMin === 25) {
      return NextResponse.json(
        { error: "You can't create 25-minute sessions" },
        { status: 400 },
      );
    }
    if (s.getTime() < now.getTime() + CREW_MIN_LEAD_MS) {
      return NextResponse.json(
        {
          error:
            "You should create sessions at least 1 hour in advance",
        },
        { status: 400 },
      );
    }
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

  const joinedAt = new Date();
  const insert = await db.collection("sessions").insertOne({
    owner_id: userId,
    start_time: s,
    end_time: e,
    duration_min: durationMin as DurationMin,
    session_type: sessionType as SessionType,
    status: "available",
    participant_count: 1,
    session_participants: [
      { user_id: userId, joined_at: joinedAt, quiet: Boolean(quietOwner) },
    ],
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Optimistic concurrency control to resolve race conditions
  if (await hasSessionOverlap(db, userId, s, e, String(insert.insertedId))) {
    await db.collection("sessions").deleteOne({ _id: insert.insertedId });
    return NextResponse.json(
      { error: "You already have a session during this time" },
      { status: 409 },
    );
  }

  await publishSessionDocUpserted(db, {
    _id: insert.insertedId,
    owner_id: userId,
    start_time: s,
    end_time: e,
    duration_min: durationMin as DurationMin,
    session_type: sessionType as SessionType,
    status: "available",
    participant_count: 1,
    session_participants: [
      { user_id: userId, joined_at: joinedAt, quiet: Boolean(quietOwner) },
    ],
  });
  return NextResponse.json({ id: String(insert.insertedId) });
}
