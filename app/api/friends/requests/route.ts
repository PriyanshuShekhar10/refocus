import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";

// POST /api/friends/requests { to_user_id }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session as any)?.user?.id as string | undefined;
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { to_user_id } = body as { to_user_id?: string };
  if (!to_user_id)
    return NextResponse.json({ error: "Missing to_user_id" }, { status: 400 });
  if (to_user_id === currentUserId)
    return NextResponse.json(
      { error: "Cannot friend yourself" },
      { status: 400 }
    );
  const db = await getDb();
  await db.collection("friend_requests").insertOne({
    from_user_id: currentUserId,
    to_user_id,
    status: "pending",
    created_at: new Date(),
  });
  return NextResponse.json({ ok: true });
}

// GET /api/friends/requests?type=incoming|outgoing
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUserId2 = (session as any)?.user?.id as string | undefined;
  if (!currentUserId2)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "incoming";

  const column = type === "outgoing" ? "from_user_id" : "to_user_id";
  const db = await getDb();
  const data = await db
    .collection("friend_requests")
    .find({ [column]: currentUserId2 })
    .sort({ created_at: -1 })
    .project({})
    .toArray();
  const requests = data.map((d: any) => ({
    id: String(d._id),
    from_user_id: d.from_user_id,
    to_user_id: d.to_user_id,
    status: d.status,
    created_at: d.created_at,
  }));
  return NextResponse.json({ requests });
}
