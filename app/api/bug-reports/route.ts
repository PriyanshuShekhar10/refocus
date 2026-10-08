import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { notifyOpsBugReport } from "@/lib/email/opsNotify";

const clip = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : null;

/**
 * POST /api/bug-reports — a signed-in user reports a bug from the dashboard.
 * Stored in `bug_reports`, then emailed to the team.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(`bug:${userId}`, "report");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const description = clip(body.description, 4000) ?? "";
  if (description.length < 10) {
    return NextResponse.json(
      { error: "Please describe the bug in at least 10 characters." },
      { status: 400 },
    );
  }

  const db = await getDb();
  const user = ObjectId.isValid(userId)
    ? await db.collection("users").findOne(
        { _id: new ObjectId(userId) },
        { projection: { email: 1, firstname: 1, lastname: 1, name: 1 } },
      )
    : null;
  const name =
    [user?.firstname, user?.lastname].filter(Boolean).join(" ").trim() ||
    (user?.name as string | undefined) ||
    null;
  const email = (user?.email as string | undefined) ?? null;

  const doc = {
    userId,
    userEmail: email,
    userName: name,
    description,
    pageUrl: clip(body.pageUrl, 500),
    userAgent: clip(req.headers.get("user-agent"), 400),
    viewport: clip(body.viewport, 40),
    timezone: clip(body.timezone, 80),
    status: "open" as const,
    createdAt: new Date(),
  };
  const { insertedId } = await db.collection("bug_reports").insertOne(doc);

  const { sent } = await notifyOpsBugReport({
    reportId: String(insertedId),
    reporter: { name, email, userId },
    description,
    pageUrl: doc.pageUrl,
    userAgent: doc.userAgent,
    viewport: doc.viewport,
    timezone: doc.timezone,
  });
  if (sent) {
    await db.collection("bug_reports").updateOne({ _id: insertedId }, { $set: { emailedAt: new Date() } });
  }

  return NextResponse.json({ ok: true, id: String(insertedId) }, { status: 201 });
}
