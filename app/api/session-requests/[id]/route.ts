import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { chatChannel, publish } from "@/lib/sse";

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

  const body = await req.json().catch(() => ({}));
  const { action, message } = body as {
    action?: "accept" | "decline";
    message?: string;
  };
  if (!action)
    return NextResponse.json({ error: "Missing action" }, { status: 400 });

  const { id } = await params;
  const db = await getDb();

  const reqDoc = await db
    .collection("session_requests")
    .findOne({ _id: new ObjectId(id) });
  if (!reqDoc)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (reqDoc.to_user_id !== currentUserId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (reqDoc.status !== "pending")
    return NextResponse.json({ error: "Already responded" }, { status: 400 });

  const nextStatus = action === "accept" ? "accepted" : "declined";

  // If accepted, create a session and add both users
  let createdSessionId: string | null = null;
  if (action === "accept") {
    const start = new Date(reqDoc.start_time);
    const end = new Date(
      start.getTime() + (reqDoc.duration_min ?? 25) * 60_000,
    );
    const insert = await db.collection("sessions").insertOne({
      owner_id: reqDoc.from_user_id,
      start_time: start,
      end_time: end,
      duration_min: reqDoc.duration_min,
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
  }

  await db.collection("session_requests").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: nextStatus,
        response_message: message ?? null,
        responded_at: new Date(),
      },
    },
  );

  // Best-effort: update any chat message payload that references this request
  try {
    await db.collection("messages").updateMany(
      { "payload.sessionRequestId": String(reqDoc._id) },
      {
        $set: {
          "payload.status": nextStatus,
          "payload.responseMessage": message ?? null,
          "payload.sessionId": createdSessionId ?? null,
        },
      },
    );
    // Publish to chat channel for both users (async for Redis support)
    const channel = chatChannel(reqDoc.from_user_id, reqDoc.to_user_id);
    await publish(channel, {
      type: "session-request:update",
      payload: { id: String(reqDoc._id), status: nextStatus },
    });
  } catch {}

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
    await publish(channel, {
      type: "session-request:update",
      payload: { id: String(reqDoc._id), status: "cancelled" },
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
