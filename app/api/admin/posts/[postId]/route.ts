import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { ObjectId } from "mongodb";
import { getUserAuditLabel, logAdminAction } from "@/lib/adminAudit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { postId } = await params;
  if (!ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  const db = await getDb();
  const post = await db.collection("community_posts").findOne({
    _id: new ObjectId(postId),
    deletedAt: { $exists: false },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const authorId = post.authorId?.toString?.() ?? String(post.authorId);
  const target = await getUserAuditLabel(authorId);

  const result = await db.collection("community_posts").updateOne(
    { _id: new ObjectId(postId), deletedAt: { $exists: false } },
    {
      $set: {
        deletedAt: new Date(),
        deletedByAdmin: guard.admin.userId,
      },
    },
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await logAdminAction({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    action: "post.delete",
    targetUserId: authorId,
    targetUserEmail: target.email,
    targetLabel: target.label,
    resourceId: postId,
  });

  return NextResponse.json({ ok: true });
}
