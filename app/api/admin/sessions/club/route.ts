import { NextResponse, after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/adminAudit";
import { getDb } from "@/lib/mongodb";
import { areUsersBlocked } from "@/lib/blocking";
import { hasSessionStarted } from "@/lib/sessionWindow";
import { notifySessionMatched } from "@/lib/notifySessionMatched";
import {
  publishSessionDocUpserted,
  publishSessionRemoved,
} from "@/lib/sessionRealtime";

type SessionParticipant = {
  user_id: string;
  joined_at?: Date | string;
  quiet?: boolean;
  label?: string | null;
};

type SessionDoc = {
  _id: ObjectId;
  owner_id: string;
  start_time: Date | string;
  end_time: Date | string;
  duration_min?: number;
  session_type?: string;
  status?: string;
  name?: string | null;
  color?: string | null;
  participant_count?: number;
  session_participants?: SessionParticipant[];
};

function soloUserId(s: SessionDoc): string | null {
  const parts = s.session_participants ?? [];
  if (parts.length !== 1) return null;
  const id = parts[0]?.user_id;
  return id ? String(id) : null;
}

function isSoloOpen(s: SessionDoc): boolean {
  const parts = s.session_participants ?? [];
  if (parts.length !== 1) return false;
  if (typeof s.participant_count === "number" && s.participant_count !== 1) {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as {
    keepId?: unknown;
    absorbId?: unknown;
  };
  const keepId = typeof body.keepId === "string" ? body.keepId : "";
  const absorbId = typeof body.absorbId === "string" ? body.absorbId : "";

  if (!ObjectId.isValid(keepId) || !ObjectId.isValid(absorbId)) {
    return NextResponse.json(
      { error: "Invalid session id" },
      { status: 400 },
    );
  }
  if (keepId === absorbId) {
    return NextResponse.json(
      { error: "Sessions must be different" },
      { status: 400 },
    );
  }

  const db = await getDb();
  const col = db.collection<SessionDoc>("sessions");

  const [keep, absorb] = await Promise.all([
    col.findOne({ _id: new ObjectId(keepId) }),
    col.findOne({ _id: new ObjectId(absorbId) }),
  ]);

  if (!keep || !absorb) {
    return NextResponse.json(
      { error: "One or both sessions not found" },
      { status: 404 },
    );
  }

  if (!isSoloOpen(keep) || !isSoloOpen(absorb)) {
    return NextResponse.json(
      { error: "Both sessions must be open solo slots" },
      { status: 409 },
    );
  }

  const keepUserId = soloUserId(keep);
  const absorbUserId = soloUserId(absorb);
  if (!keepUserId || !absorbUserId) {
    return NextResponse.json(
      { error: "Both sessions must be open solo slots" },
      { status: 409 },
    );
  }
  if (keepUserId === absorbUserId) {
    return NextResponse.json(
      { error: "Sessions belong to the same person" },
      { status: 409 },
    );
  }

  const keepStart = new Date(keep.start_time);
  const absorbStart = new Date(absorb.start_time);
  const keepDuration = keep.duration_min ?? null;
  const absorbDuration = absorb.duration_min ?? null;

  if (
    Number.isNaN(keepStart.getTime()) ||
    Number.isNaN(absorbStart.getTime()) ||
    keepStart.getTime() !== absorbStart.getTime() ||
    keepDuration === null ||
    absorbDuration === null ||
    keepDuration !== absorbDuration
  ) {
    return NextResponse.json(
      { error: "Sessions must share the same start time and duration" },
      { status: 409 },
    );
  }

  const keepEnd = new Date(keep.end_time);
  const now = new Date();
  if (Number.isNaN(keepEnd.getTime()) || keepEnd.getTime() <= now.getTime()) {
    return NextResponse.json(
      { error: "Session has already ended" },
      { status: 400 },
    );
  }
  if (hasSessionStarted(keepStart, now)) {
    return NextResponse.json(
      { error: "Session has already started" },
      { status: 400 },
    );
  }

  if (await areUsersBlocked(keepUserId, absorbUserId)) {
    return NextResponse.json(
      { error: "These users have blocked each other" },
      { status: 403 },
    );
  }

  const absorbParticipant = (absorb.session_participants ?? [])[0];
  const joinedAt = new Date();
  const pushed: SessionParticipant = {
    user_id: absorbUserId,
    joined_at: joinedAt,
  };
  if (typeof absorbParticipant?.quiet === "boolean") {
    pushed.quiet = absorbParticipant.quiet;
  }
  if (
    typeof absorbParticipant?.label === "string" ||
    absorbParticipant?.label === null
  ) {
    pushed.label = absorbParticipant.label;
  }

  const booked = await col.findOneAndUpdate(
    {
      _id: new ObjectId(keepId),
      start_time: { $gt: now },
      "session_participants.user_id": { $ne: absorbUserId },
      $or: [
        { participant_count: 1 },
        {
          participant_count: { $exists: false },
          "session_participants.1": { $exists: false },
          "session_participants.0": { $exists: true },
        },
      ],
    },
    {
      $push: { session_participants: pushed } as never,
      $set: {
        status: "booked",
        participant_count: 2,
        updated_at: joinedAt,
      },
    },
    { returnDocument: "after" },
  );

  if (!booked) {
    return NextResponse.json(
      { error: "Could not club sessions (slot may have filled)" },
      { status: 409 },
    );
  }

  const deleteResult = await col.deleteOne({ _id: new ObjectId(absorbId) });
  if (deleteResult.deletedCount !== 1) {
    console.error(
      "[admin/sessions/club] absorb session missing after merge",
      absorbId,
    );
  }

  await publishSessionRemoved(absorbId);
  const bookedForRealtime = {
    ...booked,
    duration_min: booked.duration_min ?? 50,
    session_type: booked.session_type ?? "focus",
  };
  await publishSessionDocUpserted(db, bookedForRealtime);

  after(() =>
    notifySessionMatched(db, bookedForRealtime).catch((err) => {
      console.error("[email] notifySessionMatched failed after club:", err);
    }),
  );

  await logAdminAction({
    actorId: gate.admin.userId,
    actorEmail: gate.admin.email,
    action: "session.club",
    resourceId: keepId,
    details: {
      keepId,
      absorbId,
      keepUserId,
      absorbUserId,
      startTime: keepStart.toISOString(),
      durationMin: keepDuration,
    },
  });

  return NextResponse.json({
    ok: true,
    sessionId: keepId,
    removedSessionId: absorbId,
  });
}
