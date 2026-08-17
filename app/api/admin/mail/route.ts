import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/adminAudit";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { isResendConfigured } from "@/lib/resend";
import {
  ADMIN_MAIL_BODY_MAX,
  ADMIN_MAIL_MAX_RECIPIENTS,
  ADMIN_MAIL_SUBJECT_MAX,
  sendAdminUserEmail,
} from "@/lib/email/sendAdminMail";

type UserRow = {
  _id: ObjectId;
  email?: string | null;
  firstname?: string | null;
  name?: string | null;
  username?: string | null;
};

function displayName(user: UserRow): string | null {
  return user.firstname?.trim() || user.name?.trim() || user.username || null;
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "40", 10), 80);

  const db = await getDb();
  const [messages, total] = await Promise.all([
    db
      .collection("admin_mail")
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray(),
    db.collection("admin_mail").countDocuments({}),
  ]);

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: String(m._id),
      actorEmail: m.actorEmail ?? null,
      subject: m.subject ?? "",
      body: m.body ?? "",
      recipients: m.recipients ?? [],
      sentCount: m.sentCount ?? 0,
      failedCount: m.failedCount ?? 0,
      createdAt: m.createdAt
        ? new Date(m.createdAt as Date).toISOString()
        : null,
    })),
    total,
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const rl = await checkRateLimit(guard.admin.userId, "admin_mail");
  if (!rl.success) return rateLimitedResponse(rl);

  if (!isResendConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured on this server." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    userIds?: unknown;
    subject?: unknown;
    body?: unknown;
  };

  const userIds = Array.isArray(body.userIds)
    ? [...new Set(body.userIds.filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))]
    : [];
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.body === "string" ? body.body.trim() : "";

  if (userIds.length === 0) {
    return NextResponse.json({ error: "Pick at least one user." }, { status: 400 });
  }
  if (userIds.length > ADMIN_MAIL_MAX_RECIPIENTS) {
    return NextResponse.json(
      { error: `You can email at most ${ADMIN_MAIL_MAX_RECIPIENTS} people at once.` },
      { status: 400 },
    );
  }
  if (!subject || subject.length > ADMIN_MAIL_SUBJECT_MAX) {
    return NextResponse.json(
      { error: `Subject is required (max ${ADMIN_MAIL_SUBJECT_MAX} characters).` },
      { status: 400 },
    );
  }
  if (!message || message.length > ADMIN_MAIL_BODY_MAX) {
    return NextResponse.json(
      { error: `Message is required (max ${ADMIN_MAIL_BODY_MAX} characters).` },
      { status: 400 },
    );
  }

  const db = await getDb();
  const users = (await db
    .collection<UserRow>("users")
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
    .project({ email: 1, firstname: 1, name: 1, username: 1 })
    .toArray()) as UserRow[];

  const byId = new Map(users.map((u) => [String(u._id), u]));
  const recipients: Array<{
    userId: string;
    email: string | null;
    name: string | null;
    status: "sent" | "failed" | "skipped";
    error?: string;
  }> = [];

  for (const userId of userIds) {
    const user = byId.get(userId);
    const email = user?.email?.trim() || null;
    const name = user ? displayName(user) : null;
    if (!user || !email) {
      recipients.push({
        userId,
        email,
        name,
        status: "skipped",
        error: "No email on this account",
      });
      continue;
    }

    const result = await sendAdminUserEmail({
      email,
      firstName: user.firstname || user.name,
      subject,
      body: message,
    });
    recipients.push({
      userId,
      email,
      name,
      status: result.sent ? "sent" : "failed",
      error: result.sent ? undefined : result.reason,
    });
  }

  const sentCount = recipients.filter((r) => r.status === "sent").length;
  const failedCount = recipients.filter((r) => r.status !== "sent").length;

  await db.collection("admin_mail").insertOne({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    subject,
    body: message,
    recipients,
    sentCount,
    failedCount,
    createdAt: new Date(),
  });

  await logAdminAction({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    action: "user.email",
    details: {
      subject,
      sentCount,
      failedCount,
      recipientEmails: recipients.map((r) => r.email).filter(Boolean),
    },
  });

  if (sentCount === 0) {
    return NextResponse.json(
      { error: "Could not send to any of the selected users.", recipients, sentCount, failedCount },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, sentCount, failedCount, recipients });
}
