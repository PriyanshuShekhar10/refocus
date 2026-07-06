import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { getUserAuditLabel, logAdminAction } from "@/lib/adminAudit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { commentId } = await params;
  if (!ObjectId.isValid(commentId)) {
    return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
  }

  const db = await getDb();
  const comment = await db.collection("community_comments").findOne({
    _id: new ObjectId(commentId),
    deletedAt: { $exists: false },
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const authorId = comment.authorId?.toString?.() ?? String(comment.authorId);
  const target = await getUserAuditLabel(authorId);

  const result = await db.collection("community_comments").updateOne(
    { _id: new ObjectId(commentId), deletedAt: { $exists: false } },
    {
      $set: {
        deletedAt: new Date(),
        deletedByAdmin: guard.admin.userId,
      },
    },
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  await logAdminAction({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    action: "comment.delete",
    targetUserId: authorId,
    targetUserEmail: target.email,
    targetLabel: target.label,
    resourceId: commentId,
  });

  return NextResponse.json({ ok: true });
}
