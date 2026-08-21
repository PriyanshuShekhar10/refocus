import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { publishAbly } from "@/lib/ably-server";
import { isOwnerOrParticipant, toObjectId } from "@/lib/sessionAccess";
import { sessionAlertsChannel } from "@/lib/realtimeChannels";
import type { SessionCheerEvent } from "@/types/sessionCheer";

export type { SessionCheerEvent };

type SessionDoc = {
  _id: ObjectId;
  owner_id: string;
  session_participants?: Array<{ user_id: string }>;
};

/**
 * POST /api/sessions/[id]/alert — ping partner with cheer (sound + confetti).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const oid = toObjectId(sessionId);
  if (!oid) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const db = await getDb();
  const doc = await db.collection<SessionDoc>("sessions").findOne({ _id: oid });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isOwnerOrParticipant(doc, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const event: SessionCheerEvent = {
    type: "session_cheer",
    sessionId,
    fromUserId: userId,
    at: new Date().toISOString(),
  };
  await publishAbly(sessionAlertsChannel(sessionId), event);

  return NextResponse.json({ ok: true });
}
