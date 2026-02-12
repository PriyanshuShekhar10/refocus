import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { publish, sessionsChannel } from "@/lib/sse";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { sessions, friendId } = body as {
    sessions?: Array<{
      start: string;
      end: string;
      durationMin: 25 | 50 | 75;
      sessionType: "focus" | "deep-work" | "learning";
      goal?: string;
    }>;
    friendId?: string;
  };

  if (!sessions || sessions.length === 0) {
    return NextResponse.json(
      { error: "No sessions to book" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const now = new Date();
  const created: string[] = [];
  const errors: string[] = [];

  for (const s of sessions) {
    const startTime = new Date(s.start);
    const endTime = new Date(s.end);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      errors.push(`Invalid time: ${s.start}`);
      continue;
    }

    if (startTime <= now) {
      errors.push(`Session at ${s.start} is in the past`);
      continue;
    }

    // Check for conflicts with existing sessions
    const conflict = await db.collection("sessions").findOne({
      "session_participants.user_id": userId,
      start_time: { $lt: endTime },
      end_time: { $gt: startTime },
    });

    if (conflict) {
      errors.push(
        `Conflict at ${startTime.toLocaleString()} — you already have a session`
      );
      continue;
    }

    // Build participants array
    const participants: Array<{
      user_id: string;
      joined_at: Date;
      quiet: boolean;
    }> = [{ user_id: userId, joined_at: new Date(), quiet: false }];

    // If booking with a friend, also check their conflicts and add them
    if (friendId) {
      const friendConflict = await db.collection("sessions").findOne({
        "session_participants.user_id": friendId,
        start_time: { $lt: endTime },
        end_time: { $gt: startTime },
      });

      if (friendConflict) {
        errors.push(
          `Friend has a conflict at ${startTime.toLocaleString()}`
        );
        continue;
      }

      participants.push({
        user_id: friendId,
        joined_at: new Date(),
        quiet: false,
      });
    }

    const insert = await db.collection("sessions").insertOne({
      owner_id: userId,
      start_time: startTime,
      end_time: endTime,
      duration_min: s.durationMin,
      session_type: s.sessionType,
      status: friendId ? "booked" : "available",
      name: s.goal || null,
      color: null,
      session_participants: participants,
      created_at: new Date(),
      updated_at: new Date(),
    });

    created.push(String(insert.insertedId));
  }

  // Publish SSE update
  if (created.length > 0) {
    await publish(sessionsChannel(), { type: "sessions_updated" });
  }

  return NextResponse.json({
    created,
    errors,
    totalCreated: created.length,
    totalErrors: errors.length,
  });
}
