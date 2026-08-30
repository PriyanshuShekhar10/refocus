import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { requireVerifiedEmail } from "@/lib/requireVerifiedEmail";

// DELETE - Soft-delete own comment
export async function DELETE(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ postId: string; commentId: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailGate = await requireVerifiedEmail(userId);
  if (emailGate) return emailGate;

  const { postId, commentId } = await params;

  if (!ObjectId.isValid(postId) || !ObjectId.isValid(commentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getDb();
  const comment = await db.collection("community_comments").findOne({
    _id: new ObjectId(commentId),
    postId: new ObjectId(postId),
    deletedAt: { $exists: false },
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (String(comment.authorId) !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.collection("community_comments").updateOne(
    { _id: new ObjectId(commentId) },
    { $set: { deletedAt: new Date() } },
  );

  return NextResponse.json({ ok: true });
}
