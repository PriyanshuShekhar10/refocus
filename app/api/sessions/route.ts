import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
      { status: 400 }
    );
  }

  // Fetch sessions in range with participants
  const db = await getDb();
  const col = db.collection<DbSession>("sessions");
  let sessions: DbSession[] = (await col
    .find({ start_time: { $gte: new Date(from), $lt: new Date(to) } })
    .sort({ start_time: 1 })
    .toArray()) as unknown as DbSession[];

  // Visibility rule: sessions with 2 participants (booked) should only be visible
  // to their participants and the owner. Others see only available sessions.
  sessions = (sessions ?? []).filter((s) => {
    const participants = s.session_participants ?? [];
    const count = participants.length ?? 0;
    if (count < 2) return true; // available (or not yet fully booked)
    // booked: allow only if current user is owner or participant
    const isOwner = s.owner_id === userId;
    const isParticipant = participants.some((p) => p.user_id === userId);
    return isOwner || isParticipant;
  });

  // Collect unique user IDs (owner + participants) to hydrate with user profile info
  const userIdSet = new Set<string>();
  (sessions ?? []).forEach((s) => {
    if (s.owner_id) userIdSet.add(String(s.owner_id));
    (s.session_participants ?? []).forEach((p) =>
      userIdSet.add(String(p.user_id))
    );
  });

  type DbUser = {
    _id: ObjectId;
    email?: string;
    name?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  };

  let usersById: Record<
    string,
    {
      id: string;
      email?: string;
      firstname?: string | null;
      lastname?: string | null;
    }
  > = {};
  if (userIdSet.size > 0) {
    const ids = Array.from(userIdSet);
    const users = (await db
      .collection<DbUser>("users")
      .find({ _id: { $in: ids.map((i) => new ObjectId(i)) } })
      .project({ email: 1, name: 1, firstname: 1, lastname: 1 })
      .toArray()) as unknown as DbUser[];
    usersById = Object.fromEntries(
      users.map((u) => [
        String(u._id),
        {
          id: String(u._id),
          email: u.email,
          firstname:
            u.firstname ?? (u.name ? String(u.name).split(" ")[0] : null),
          lastname: u.lastname ?? null,
        },
      ])
    );
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
        email: usersById[p.user_id]?.email,
        firstname: usersById[p.user_id]?.firstname ?? undefined,
        lastname: usersById[p.user_id]?.lastname ?? undefined,
        quiet: Boolean(p.quiet),
      })),
      owner: usersById[s.owner_id] ?? null,
      status,
    };
  });

  return NextResponse.json({ currentUserId: userId, sessions: mapped });
}

// POST /api/sessions
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { start, durationMin, sessionType, quietOwner } = body as {
    start?: string;
    durationMin?: 25 | 50 | 75;
    sessionType?: "focus" | "deep-work" | "learning";
    quietOwner?: boolean;
  };
  if (!start || !durationMin || !sessionType) {
    return NextResponse.json(
      { error: "Missing start, durationMin, or sessionType" },
      { status: 400 }
    );
  }
  const s = new Date(start);
  const e = new Date(s.getTime() + durationMin * 60_000);

  // Create session
  const db = await getDb();
  const insert = await db.collection("sessions").insertOne({
    owner_id: userId,
    start_time: s,
    end_time: e,
    duration_min: durationMin,
    session_type: sessionType,
    status: "available",
    session_participants: [
      { user_id: userId, joined_at: new Date(), quiet: Boolean(quietOwner) },
    ],
    created_at: new Date(),
    updated_at: new Date(),
  });
  return NextResponse.json({ id: String(insert.insertedId) });
}
