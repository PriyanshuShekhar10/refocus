import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { areFriends } from "@/lib/friendship";
import { chatChannel, publish } from "@/lib/sse";
import { publishAbly } from "@/lib/ably-server";

type ChatMessageDoc = {
  _id: ObjectId;
  from_user_id: string;
  to_user_id: string;
  type: "text" | "session-request" | "system";
  content?: string | null;
  deleted?: boolean;
};

async function getAuthedContext(params: Promise<{ friendId: string; messageId: string }>) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { friendId, messageId } = await params;
  if (!(await areFriends(currentUserId, friendId))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!ObjectId.isValid(messageId)) {
    return { error: NextResponse.json({ error: "Invalid message id" }, { status: 400 }) };
  }
  return { currentUserId, friendId, messageObjectId: new ObjectId(messageId) };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ friendId: string; messageId: string }> },
) {
  const ctx = await getAuthedContext(params);
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Empty content" }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.collection<ChatMessageDoc>("messages").findOne({
    _id: ctx.messageObjectId,
    $or: [
      { from_user_id: ctx.currentUserId, to_user_id: ctx.friendId },
      { from_user_id: ctx.friendId, to_user_id: ctx.currentUserId },
    ],
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.from_user_id !== ctx.currentUserId) {
    return NextResponse.json({ error: "You can only edit your own messages" }, { status: 403 });
  }
  if (existing.type !== "text") {
    return NextResponse.json({ error: "Only text messages can be edited" }, { status: 400 });
  }
  if (existing.deleted) {
    return NextResponse.json({ error: "Cannot edit deleted message" }, { status: 400 });
  }

  const editedAt = new Date();
  await db.collection("messages").updateOne(
    { _id: ctx.messageObjectId },
    { $set: { content, edited_at: editedAt } },
  );

  const channel = chatChannel(ctx.currentUserId, ctx.friendId);
  const event = {
    type: "message:updated",
    payload: {
      id: String(ctx.messageObjectId),
      content,
      edited_at: editedAt.toISOString(),
    },
  };
  await Promise.all([publish(channel, event), publishAbly(channel, event)]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ friendId: string; messageId: string }> },
) {
  const ctx = await getAuthedContext(params);
  if ("error" in ctx) return ctx.error;

  const db = await getDb();
  const existing = await db.collection<ChatMessageDoc>("messages").findOne({
    _id: ctx.messageObjectId,
    $or: [
      { from_user_id: ctx.currentUserId, to_user_id: ctx.friendId },
      { from_user_id: ctx.friendId, to_user_id: ctx.currentUserId },
    ],
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.from_user_id !== ctx.currentUserId) {
    return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
  }
  if (existing.type !== "text") {
    return NextResponse.json({ error: "Only text messages can be deleted" }, { status: 400 });
  }
  if (existing.deleted) return NextResponse.json({ ok: true });

  const deletedAt = new Date();
  await db.collection("messages").updateOne(
    { _id: ctx.messageObjectId },
    {
      $set: {
        deleted: true,
        deleted_at: deletedAt,
        content: "[This message was deleted]",
      },
      $unset: { edited_at: "" },
    },
  );

  const channel = chatChannel(ctx.currentUserId, ctx.friendId);
  const event = {
    type: "message:deleted",
    payload: {
      id: String(ctx.messageObjectId),
      content: "[This message was deleted]",
      deleted_at: deletedAt.toISOString(),
    },
  };
  await Promise.all([publish(channel, event), publishAbly(channel, event)]);

  return NextResponse.json({ ok: true });
}
