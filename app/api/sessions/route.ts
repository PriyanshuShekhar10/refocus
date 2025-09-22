import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/sessions?from=ISO&to=ISO
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
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
  const sessions: any[] = await db
    .collection("sessions")
    .find({ start_time: { $gte: new Date(from), $lt: new Date(to) } })
    .sort({ start_time: 1 })
    .toArray();

  // Collect unique user IDs (owner + participants) to hydrate with user profile info
  const userIdSet = new Set<string>();
  (sessions ?? []).forEach((s: any) => {
    if (s.owner_id) userIdSet.add(String(s.owner_id));
    (s.session_participants ?? []).forEach((p: any) =>
      userIdSet.add(String(p.user_id))
    );
  });

  let usersById: Record<
    string,
    { id: string; email?: string; firstname?: string; lastname?: string }
  > = {};
  if (userIdSet.size > 0) {
    const ids = Array.from(userIdSet);
    const users = (await db
      .collection("users")
      .find({ _id: { $in: ids.map((i) => new ObjectId(i)) } })
      .project({ email: 1, name: 1 })
      .toArray()) as any[];
    usersById = Object.fromEntries(
      users.map((u: any) => [
        String(u._id),
        {
          id: String(u._id),
          email: u.email,
          firstname: u.name || undefined,
          lastname: undefined,
        },
      ])
    );
  }

  const now = new Date();
  const mapped = (sessions ?? []).map((s: any) => {
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    let status: "available" | "booked" | "in-progress" | "completed" =
      s.status ?? "available";
    const count = (s.session_participants?.length ?? 0) as number;
    if (now > end) status = "completed";
    else if (now >= start && now <= end) status = "in-progress";
    else if (count >= 2) status = "booked";

    return {
      id: String(s._id),
      owner_id: s.owner_id,
      start: start.toISOString(),
      end: end.toISOString(),
      durationMin: s.duration_min as 25 | 50 | 75,
      sessionType: s.session_type as "focus" | "deep-work" | "learning",
      name: s.name ?? null,
      color: s.color ?? null,
      participants: (s.session_participants ?? []).map(
        (p: { user_id: string; joined_at: string }) => ({
          user_id: p.user_id,
          joined_at: p.joined_at,
          email: usersById[p.user_id]?.email,
          firstname: usersById[p.user_id]?.firstname,
          lastname: usersById[p.user_id]?.lastname,
        })
      ),
      owner: usersById[s.owner_id] ?? null,
      status,
    };
  });

  return NextResponse.json({ currentUserId: userId, sessions: mapped });
}

// POST /api/sessions
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { start, durationMin, sessionType } = body as {
    start?: string;
    durationMin?: 25 | 50 | 75;
    sessionType?: "focus" | "deep-work" | "learning";
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
    session_participants: [{ user_id: userId, joined_at: new Date() }],
    created_at: new Date(),
    updated_at: new Date(),
  });
  return NextResponse.json({ id: String(insert.insertedId) });
}
