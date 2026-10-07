import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/ratelimit";
import { isValidPublishKey, triggerBlogDeploy } from "@/lib/blogPosts";

/**
 * POST /api/blog/rebuild — rebuild the static blog (e.g. after a post was
 * deleted, or if a publish couldn't start the rebuild). Same key as publish.
 */
export async function POST(req: NextRequest) {
  if (!isValidPublishKey(req.headers)) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }
  const limit = await checkRateLimit(`blog_publish:${getClientIp(req)}`, "blog_publish");
  if (!limit.success) return rateLimitedResponse(limit);

  const deploy = await triggerBlogDeploy();
  if (!deploy.ok) {
    console.error("[blog/rebuild] deploy trigger failed:", deploy.error);
    return NextResponse.json({ ok: false, error: deploy.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, message: "Rebuild started; changes are live in about 2–3 minutes." });
}
