import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { chatChannel, publish, sessionsChannel } from "@/lib/sse";
import { publishAbly } from "@/lib/ably-server";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { DURATION_OPTIONS, type DurationMin } from "@/constants/calendar";
import { hasSessionOverlap } from "@/lib/sessionOverlap";

// POST /api/session-requests/:id { action: 'accept'|'decline', message?: string }
// On accept: create a session and add both users as participants
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(currentUserId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { action, message } = body as {
    action?: "accept" | "decline";
    message?: string;
  };
  if (!action || (action !== "accept" && action !== "decline"))
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }
  const db = await getDb();
  const trimmedMessage = message ? String(message).slice(0, 500) : null;
  const nextStatus = action === "accept" ? "accepted" : "declined";

  // Atomically claim the request: only transition if still pending and
  // current user is the recipient. Prevents double-accept races.
  const claim = await db.collection("session_requests").findOneAndUpdate(
    {
      _id: new ObjectId(id),
      to_user_id: currentUserId,
      status: "pending",
    },
    {
      $set: {
        status: nextStatus,
        response_message: trimmedMessage,
        responded_at: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  if (!claim) {
    // Distinguish: missing vs forbidden vs already-responded
    const existing = await db
      .collection("session_requests")
      .findOne({ _id: new ObjectId(id) });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.to_user_id !== currentUserId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Already responded" }, { status: 400 });
  }

  const reqDoc = claim as unknown as {
    _id: ObjectId;
    from_user_id: string;
    to_user_id: string;
    start_time: Date;
    duration_min: number;
  };

  let createdSessionId: string | null = null;
  if (action === "accept") {
    const start = new Date(reqDoc.start_time);
    const duration =
      DURATION_OPTIONS.includes(reqDoc.duration_min as DurationMin)
        ? (reqDoc.duration_min as DurationMin)
        : 25;
    const end = new Date(start.getTime() + duration * 60_000);
    const now = new Date();

    // Validate the request is still actionable at accept time. If it's not,
    // we still want to roll back to a sensible state so the UI can update.
    let acceptError: string | null = null;
    if (start.getTime() <= now.getTime()) {
      acceptError = "This session time has already passed";
    } else if (
      await hasSessionOverlap(db, reqDoc.from_user_id, start, end)
    ) {
      acceptError = "The requester now has a conflict at this time";
    } else if (await hasSessionOverlap(db, reqDoc.to_user_id, start, end)) {
      acceptError = "You now have a session conflict at this time";
    }

    if (acceptError) {
      // Revert the claim — turn it into a declined response so it can't be
      // accepted later by retrying.
      await db.collection("session_requests").updateOne(
        { _id: reqDoc._id },
        {
          $set: {
            status: "declined",
            response_message: acceptError,
            responded_at: new Date(),
          },
        },
      );

      // Best-effort: mark any chat message about this request as declined.
      try {
        await db.collection("messages").updateMany(
          { "payload.sessionRequestId": String(reqDoc._id) },
          {
            $set: {
              "payload.status": "declined",
              "payload.responseMessage": acceptError,
              "payload.sessionId": null,
            },
          },
        );
        const channel = chatChannel(reqDoc.from_user_id, reqDoc.to_user_id);
        const event = {
          type: "session-request:update",
          payload: { id: String(reqDoc._id), status: "declined" as const },
        };
        await Promise.all([publish(channel, event), publishAbly(channel, event)]);
      } catch {
        // ignore — best effort
      }

      return NextResponse.json({ error: acceptError }, { status: 409 });
    }

    const insert = await db.collection("sessions").insertOne({
      owner_id: reqDoc.from_user_id,
      start_time: start,
      end_time: end,
      duration_min: duration,
      session_type: "focus",
      status: "booked",
      session_participants: [
        { user_id: reqDoc.from_user_id, joined_at: new Date(), quiet: false },
        { user_id: reqDoc.to_user_id, joined_at: new Date(), quiet: false },
      ],
      created_at: new Date(),
      updated_at: new Date(),
    });
    createdSessionId = String(insert.insertedId);
    await publish(sessionsChannel(), { type: "sessions_updated" });
  }

  // Best-effort: update any chat message payload that references this request
  try {
    await db.collection("messages").updateMany(
      { "payload.sessionRequestId": String(reqDoc._id) },
      {
        $set: {
          "payload.status": nextStatus,
          "payload.responseMessage": trimmedMessage,
          "payload.sessionId": createdSessionId ?? null,
        },
      },
    );
    // Publish to chat channel for both users (async for Redis support)
    const channel = chatChannel(reqDoc.from_user_id, reqDoc.to_user_id);
    const event = {
      type: "session-request:update",
      payload: { id: String(reqDoc._id), status: nextStatus },
    };
    await Promise.all([publish(channel, event), publishAbly(channel, event)]);
  } catch {
    // ignore — best effort
  }

  return NextResponse.json({ ok: true, sessionId: createdSessionId });
}

// DELETE /api/session-requests/:id (only requester can delete when pending)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }
  const db = await getDb();
  const reqDoc = await db
    .collection("session_requests")
    .findOne({ _id: new ObjectId(id) });
  if (!reqDoc)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (reqDoc.from_user_id !== currentUserId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (reqDoc.status !== "pending")
    return NextResponse.json(
      { error: "Cannot delete after response" },
      { status: 400 },
    );

  await db.collection("session_requests").deleteOne({ _id: new ObjectId(id) });

  // Mark any chat message as cancelled
  try {
    await db
      .collection("messages")
      .updateMany(
        { "payload.sessionRequestId": String(reqDoc._id) },
        { $set: { "payload.status": "cancelled" } },
      );
    // Publish event (async for Redis support)
    const channel = chatChannel(reqDoc.from_user_id, reqDoc.to_user_id);
    const event = {
      type: "session-request:update",
      payload: { id: String(reqDoc._id), status: "cancelled" },
    };
    await Promise.all([publish(channel, event), publishAbly(channel, event)]);
  } catch {}

  return NextResponse.json({ ok: true });
}
