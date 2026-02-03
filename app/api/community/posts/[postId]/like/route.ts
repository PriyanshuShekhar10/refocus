import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// POST - Toggle like on a post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  if (!ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  const db = await getDb();

  // Check if post exists
  const post = await db
    .collection("community_posts")
    .findOne({ _id: new ObjectId(postId), deletedAt: { $exists: false } });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Check if already liked
  const existingLike = await db.collection("community_likes").findOne({
    postId: new ObjectId(postId),
    userId: new ObjectId(userId),
  });

  if (existingLike) {
    // Unlike
    await db.collection("community_likes").deleteOne({
      postId: new ObjectId(postId),
      userId: new ObjectId(userId),
    });

    const likesCount = await db
      .collection("community_likes")
      .countDocuments({ postId: new ObjectId(postId) });

    return NextResponse.json({ liked: false, likesCount });
  } else {
    // Like
    await db.collection("community_likes").insertOne({
      postId: new ObjectId(postId),
      userId: new ObjectId(userId),
      createdAt: new Date(),
    });

    const likesCount = await db
      .collection("community_likes")
      .countDocuments({ postId: new ObjectId(postId) });

    return NextResponse.json({ liked: true, likesCount });
  }
}
