import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { BLOG_POSTS_COLLECTION, type BlogPostDoc } from "@/lib/blogPosts";

export const dynamic = "force-dynamic";

/** GET /api/blog/posts — public; read by the marketing site's build. */
export async function GET() {
  const db = await getDb();
  const posts = await db
    .collection<BlogPostDoc>(BLOG_POSTS_COLLECTION)
    .find({}, { projection: { _id: 0, createdAt: 0 } })
    .sort({ pubDate: -1 })
    .toArray();
  return NextResponse.json({ posts });
}
