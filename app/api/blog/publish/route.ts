import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/ratelimit";
import {
  BLOG_POSTS_COLLECTION,
  BLOG_SITE_URL,
  ensureBlogIndexes,
  isValidPublishKey,
  triggerBlogDeploy,
  validatePost,
  type BlogPostDoc,
  type PublishInput,
} from "@/lib/blogPosts";

/**
 * POST /api/blog/publish — publish a markdown post to refocus.co.in/blog.
 * Auth: `Authorization: Bearer <BLOG_PUBLISH_KEY>`.
 * The post is stored in MongoDB and the static blog is rebuilt (~2–3 min).
 */
export async function POST(req: NextRequest) {
  if (!isValidPublishKey(req.headers)) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }
  const limit = await checkRateLimit(`blog_publish:${getClientIp(req)}`, "blog_publish");
  if (!limit.success) return rateLimitedResponse(limit);

  const body = (await req.json().catch(() => null)) as PublishInput | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const result = validatePost(body);
  if (!result.ok) {
    return NextResponse.json({ error: "Validation failed", details: result.errors }, { status: 400 });
  }
  const { post } = result;

  // Don't collide with posts already on the site (including file-based ones).
  const live = await fetch(`${BLOG_SITE_URL}/blog/${post.slug}`, { method: "HEAD", redirect: "manual" }).catch(() => null);
  if (live && live.status === 200) {
    return NextResponse.json(
      { error: `A post already exists at /blog/${post.slug}. Pass a different "slug".` },
      { status: 409 },
    );
  }

  const db = await getDb();
  await ensureBlogIndexes(db);
  const now = new Date();
  const doc: BlogPostDoc = { ...post, pubDate: now, createdAt: now, updatedAt: now };
  try {
    await db.collection<BlogPostDoc>(BLOG_POSTS_COLLECTION).insertOne(doc);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: `A post already exists at /blog/${post.slug}. Pass a different "slug".` },
        { status: 409 },
      );
    }
    throw err;
  }

  const deploy = await triggerBlogDeploy();
  if (!deploy.ok) console.error("[blog/publish] deploy trigger failed:", deploy.error);

  return NextResponse.json(
    {
      ok: true,
      slug: post.slug,
      url: `${BLOG_SITE_URL}/blog/${post.slug}`,
      status: deploy.ok ? "publishing" : "saved",
      message: deploy.ok
        ? "Saved. The blog is rebuilding; the post will be live in about 2–3 minutes."
        : "Saved, but the site rebuild couldn't be started. It will appear on the next deploy.",
    },
    { status: 201 },
  );
}
