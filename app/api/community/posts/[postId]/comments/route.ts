import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET - Fetch comments for a post
export async function GET(
  _req: NextRequest,
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

  const comments = await db
    .collection("community_comments")
    .aggregate([
      {
        $match: {
          postId: new ObjectId(postId),
          deletedAt: { $exists: false },
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          content: 1,
          createdAt: 1,
          authorId: 1,
          "author.name": 1,
          "author.firstname": 1,
          "author.lastname": 1,
          "author.email": 1,
        },
      },
    ])
    .toArray();

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c._id.toString(),
      content: c.content,
      createdAt: c.createdAt,
      authorId: c.authorId.toString(),
      authorName:
        [c.author?.firstname, c.author?.lastname].filter(Boolean).join(" ") ||
        c.author?.name ||
        c.author?.email ||
        "User",
      authorInitials: `${(c.author?.firstname?.[0] || c.author?.name?.[0] || c.author?.email?.[0] || "U").toUpperCase()}${(c.author?.lastname?.[0] || "").toUpperCase()}`,
    })),
  });
}

// POST - Add a comment to a post
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

  const body = await req.json().catch(() => ({}));
  const { content } = body as { content?: string };

  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (content.length > 1000) {
    return NextResponse.json(
      { error: "Comment must be 1000 characters or less" },
      { status: 400 }
    );
  }

  const db = await getDb();

  // Check if post exists
  const post = await db
    .collection("community_posts")
    .findOne({ _id: new ObjectId(postId), deletedAt: { $exists: false } });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const comment = {
    postId: new ObjectId(postId),
    authorId: new ObjectId(userId),
    content: content.trim(),
    createdAt: new Date(),
  };

  const result = await db.collection("community_comments").insertOne(comment);

  // Fetch author info
  const author = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { name: 1, firstname: 1, lastname: 1, email: 1 } }
    );

  return NextResponse.json({
    comment: {
      id: result.insertedId.toString(),
      content: comment.content,
      createdAt: comment.createdAt,
      authorId: userId,
      authorName:
        [author?.firstname, author?.lastname].filter(Boolean).join(" ") ||
        author?.name ||
        author?.email ||
        "User",
      authorInitials: `${(author?.firstname?.[0] || author?.name?.[0] || author?.email?.[0] || "U").toUpperCase()}${(author?.lastname?.[0] || "").toUpperCase()}`,
    },
  });
}
