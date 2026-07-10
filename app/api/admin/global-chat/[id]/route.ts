import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { ObjectId } from "mongodb";
import { globalChatChannel } from "@/lib/sse";
import { broadcastEvent } from "@/lib/broadcaster";
import { getUserAuditLabel, logAdminAction } from "@/lib/adminAudit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id: messageId } = await params;
  if (!ObjectId.isValid(messageId)) {
    return NextResponse.json({ error: "Invalid message id" }, { status: 400 });
  }

  const db = await getDb();
  const message = await db.collection("global_messages").findOne({
    _id: new ObjectId(messageId),
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.deleted) {
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  const result = await db.collection("global_messages").updateOne(
    { _id: new ObjectId(messageId) },
    {
      $set: {
        deleted: true,
        deleted_at: new Date(),
        content: "[This message was removed by a moderator]",
        deletedByAdmin: guard.admin.userId,
      },
    },
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }

  const event = {
    type: "message:deleted",
    payload: { id: messageId },
  };
  await broadcastEvent(globalChatChannel(), event);

  const authorId = message.user_id ? String(message.user_id) : null;
  const target = authorId
    ? await getUserAuditLabel(authorId)
    : { email: message.user_email ?? null, label: message.user_name ?? null };

  await logAdminAction({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    action: "chat.delete",
    targetUserId: authorId,
    targetUserEmail: target.email ?? message.user_email ?? null,
    targetLabel: target.label ?? message.user_name ?? null,
    resourceId: messageId,
  });

  return NextResponse.json({ ok: true });
}
