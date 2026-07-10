import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { getUserAuditLabel, logAdminAction } from "@/lib/adminAudit";
import { chatChannel } from "@/lib/sse";
import { broadcastEvent } from "@/lib/broadcaster";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { messageId } = await params;
  if (!ObjectId.isValid(messageId)) {
    return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
  }

  const db = await getDb();
  const message = await db.collection("messages").findOne({
    _id: new ObjectId(messageId),
    type: "text",
    deleted: { $ne: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const authorId = String(message.from_user_id);
  const target = await getUserAuditLabel(authorId);
  const deletedAt = new Date();

  await db.collection("messages").updateOne(
    { _id: new ObjectId(messageId) },
    {
      $set: {
        deleted: true,
        deleted_at: deletedAt,
        content: "[This message was removed by a moderator]",
        deletedByAdmin: guard.admin.userId,
      },
      $unset: { edited_at: "" },
    },
  );

  const fromId = String(message.from_user_id);
  const toId = String(message.to_user_id);
  const channel = chatChannel(fromId, toId);
  const event = {
    type: "message:deleted",
    payload: {
      id: messageId,
      content: "[This message was removed by a moderator]",
      deleted_at: deletedAt.toISOString(),
    },
  };
  await broadcastEvent(channel, event);

  await logAdminAction({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    action: "friend_message.delete",
    targetUserId: authorId,
    targetUserEmail: target.email,
    targetLabel: target.label,
    resourceId: messageId,
  });

  return NextResponse.json({ ok: true });
}
