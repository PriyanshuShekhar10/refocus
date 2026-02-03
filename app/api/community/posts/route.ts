import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET - Fetch posts with pagination
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  const db = await getDb();

  const query: Record<string, unknown> = { deletedAt: { $exists: false } };
  if (cursor) {
    query._id = { $lt: new ObjectId(cursor) };
  }

  const posts = await db
    .collection("community_posts")
    .aggregate([
      { $match: query },
      { $sort: { _id: -1 } },
      { $limit: limit + 1 },
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
        $lookup: {
          from: "community_likes",
          let: { postId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$postId", "$$postId"] } } },
            { $count: "count" },
          ],
          as: "likesCount",
        },
      },
      {
        $lookup: {
          from: "community_likes",
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$postId", "$$postId"] },
                    { $eq: ["$userId", new ObjectId(userId)] },
                  ],
                },
              },
            },
          ],
          as: "userLike",
        },
      },
      {
        $lookup: {
          from: "community_comments",
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$postId", "$$postId"] },
                deletedAt: { $exists: false },
              },
            },
            { $count: "count" },
          ],
          as: "commentsCount",
        },
      },
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
          likesCount: { $ifNull: [{ $arrayElemAt: ["$likesCount.count", 0] }, 0] },
          commentsCount: { $ifNull: [{ $arrayElemAt: ["$commentsCount.count", 0] }, 0] },
          isLiked: { $gt: [{ $size: "$userLike" }, 0] },
        },
      },
    ])
    .toArray();

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, -1) : posts;
  const nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;

  return NextResponse.json({
    posts: items.map((p) => ({
      id: p._id.toString(),
      content: p.content,
      createdAt: p.createdAt,
      authorId: p.authorId.toString(),
      authorName:
        [p.author?.firstname, p.author?.lastname].filter(Boolean).join(" ") ||
        p.author?.name ||
        p.author?.email ||
        "User",
      authorInitials: `${(p.author?.firstname?.[0] || p.author?.name?.[0] || p.author?.email?.[0] || "U").toUpperCase()}${(p.author?.lastname?.[0] || "").toUpperCase()}`,
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      isLiked: p.isLiked,
    })),
    nextCursor,
  });
}

// POST - Create a new post
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { content } = body as { content?: string };

  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (content.length > 2000) {
    return NextResponse.json(
      { error: "Content must be 2000 characters or less" },
      { status: 400 }
    );
  }

  const db = await getDb();

  // Rate limiting - max 10 posts per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentPosts = await db.collection("community_posts").countDocuments({
    authorId: new ObjectId(userId),
    createdAt: { $gte: oneHourAgo },
  });

  if (recentPosts >= 10) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const post = {
    authorId: new ObjectId(userId),
    content: content.trim(),
    createdAt: new Date(),
  };

  const result = await db.collection("community_posts").insertOne(post);

  // Fetch author info
  const author = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { name: 1, firstname: 1, lastname: 1, email: 1 } }
    );

  return NextResponse.json({
    post: {
      id: result.insertedId.toString(),
      content: post.content,
      createdAt: post.createdAt,
      authorId: userId,
      authorName:
        [author?.firstname, author?.lastname].filter(Boolean).join(" ") ||
        author?.name ||
        author?.email ||
        "User",
      authorInitials: `${(author?.firstname?.[0] || author?.name?.[0] || author?.email?.[0] || "U").toUpperCase()}${(author?.lastname?.[0] || "").toUpperCase()}`,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
    },
  });
}
