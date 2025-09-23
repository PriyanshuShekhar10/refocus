import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createOrGetDailyRoom } from "@/lib/daily";

// POST /api/sessions/[id]/daily -> ensures a Daily room exists for this session
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = params;
  const db = await getDb();
  const s = await db
    .collection("sessions")
    .findOne({ _id: new ObjectId(sessionId) });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { roomName, domain } = await createOrGetDailyRoom(sessionId);
    return NextResponse.json({ roomName, domain });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
