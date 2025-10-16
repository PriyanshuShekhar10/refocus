import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

// POST /api/session-requests
// Body: { to_user_id, start: ISO string, durationMin: 25|50|75, message?: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { to_user_id, start, durationMin, message } = body as {
    to_user_id?: string;
    start?: string;
    durationMin?: 25 | 50 | 75;
    message?: string;
  };

  if (!to_user_id || !start || !durationMin)
    return NextResponse.json(
      { error: "Missing to_user_id, start, or durationMin" },
      { status: 400 }
    );
  if (to_user_id === currentUserId)
    return NextResponse.json({ error: "Cannot request yourself" }, { status: 400 });

  const s = new Date(start);
  if (isNaN(s.getTime()))
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });

  const now = new Date();
  if (s < now) {
  return NextResponse.json(
    { error: "Cannot book a session in the past" },
    { status: 400 }
  );
  }

  const db = await getDb();
  await db.collection("session_requests").insertOne({
    from_user_id: currentUserId,
    to_user_id,
    start_time: s,
    duration_min: durationMin,
    message: message ?? null,
    response_message: null,
    status: "pending",
    created_at: new Date(),
    responded_at: null,
  });
  return NextResponse.json({ ok: true });
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
  ).filter(Boolean);

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
