import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const includeDeleted = searchParams.get("includeDeleted") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

  const db = await getDb();
  const match: Record<string, unknown> = {};
  if (!includeDeleted) {
    match.deletedAt = { $exists: false };
  }

  const posts = await db
    .collection("community_posts")
    .aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
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
          content: 1,
          createdAt: 1,
          deletedAt: 1,
          authorId: 1,
          "author.email": 1,
          "author.username": 1,
          "author.name": 1,
          "author.firstname": 1,
          "author.lastname": 1,
        },
      },
    ])
    .toArray();

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: String(p._id),
      content: p.content as string,
      createdAt: p.createdAt
        ? new Date(p.createdAt as Date).toISOString()
        : null,
      deletedAt: p.deletedAt
        ? new Date(p.deletedAt as Date).toISOString()
        : null,
      authorId: p.authorId ? String(p.authorId) : null,
      authorEmail: p.author?.email ?? null,
      authorUsername: p.author?.username ?? null,
      authorName:
        [p.author?.firstname, p.author?.lastname].filter(Boolean).join(" ") ||
        p.author?.name ||
        null,
    })),
  });
}
