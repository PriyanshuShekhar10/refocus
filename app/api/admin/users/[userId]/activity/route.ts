import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import {
  isCommunityBanned,
  isCommunityMuted,
} from "@/lib/communityModeration";
import { isEmailVerified } from "@/lib/emailVerification";
import { mergeKnownIps } from "@/lib/userIps";

const PER_SOURCE = 30;

type TimelineEvent = {
  type: string;
  at: string;
  summary: string;
  meta?: Record<string, unknown>;
};

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function pushEvent(
  events: TimelineEvent[],
  type: string,
  at: unknown,
  summary: string,
  meta?: Record<string, unknown>,
) {
  const when = iso(at);
  if (!when) return;
  events.push({ type, at: when, summary, meta });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { userId } = await params;
  if (!ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const db = await getDb();
  const objectId = new ObjectId(userId);

  const user = await db.collection("users").findOne(
    { _id: objectId },
    {
      projection: {
        email: 1,
        username: 1,
        name: 1,
        firstname: 1,
        lastname: 1,
        createdAt: 1,
        signupIp: 1,
        lastLoginIp: 1,
        lastLoginAt: 1,
        lastSeenIp: 1,
        knownIps: 1,
        communityBannedAt: 1,
        communityMutedUntil: 1,
        emailVerified: 1,
      },
    },
  );
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [
    logins,
    ownedSessions,
    joinedSessions,
    friendRequests,
    sessionRequests,
    posts,
    comments,
    reportsFiled,
    reportsReceived,
    audit,
    ipActivity,
  ] = await Promise.all([
    db
      .collection("user_login_events")
      .find({ userId })
      .sort({ at: -1 })
      .limit(PER_SOURCE)
      .toArray(),
    db
      .collection("sessions")
      .find({ owner_id: userId })
      .sort({ start_time: -1 })
      .limit(PER_SOURCE)
      .project({ start_time: 1, duration_min: 1, session_type: 1 })
      .toArray(),
    db
      .collection("sessions")
      .find({
        "session_participants.user_id": userId,
        owner_id: { $ne: userId },
      })
      .sort({ start_time: -1 })
      .limit(PER_SOURCE)
      .project({ start_time: 1, duration_min: 1, session_type: 1 })
      .toArray(),
    db
      .collection("friend_requests")
      .find({
        $or: [{ from_user_id: userId }, { to_user_id: userId }],
      })
      .sort({ created_at: -1 })
      .limit(PER_SOURCE)
      .toArray(),
    db
      .collection("session_requests")
      .find({
        $or: [{ from_user_id: userId }, { to_user_id: userId }],
      })
      .sort({ created_at: -1 })
      .limit(PER_SOURCE)
      .toArray(),
    db
      .collection("community_posts")
      .find({ authorId: objectId })
      .sort({ createdAt: -1 })
      .limit(PER_SOURCE)
      .project({ content: 1, createdAt: 1 })
      .toArray(),
    db
      .collection("community_comments")
      .find({ authorId: objectId })
      .sort({ createdAt: -1 })
      .limit(PER_SOURCE)
      .project({ content: 1, createdAt: 1 })
      .toArray(),
    db
      .collection("content_reports")
      .find({ reporterId: userId })
      .sort({ createdAt: -1 })
      .limit(PER_SOURCE)
      .toArray(),
    db
      .collection("content_reports")
      .find({ reportedUserId: userId })
      .sort({ createdAt: -1 })
      .limit(PER_SOURCE)
      .toArray(),
    db
      .collection("admin_audit_log")
      .find({ targetUserId: userId })
      .sort({ createdAt: -1 })
      .limit(PER_SOURCE)
      .toArray(),
    db
      .collection("banned_ip_activity")
      .find({ createdUserId: userId })
      .sort({ createdAt: -1 })
      .limit(PER_SOURCE)
      .toArray(),
  ]);

  const events: TimelineEvent[] = [];
  pushEvent(
    events,
    "signup",
    user.createdAt,
    user.signupIp
      ? `Account created from ${user.signupIp}`
      : "Account created",
    { ip: user.signupIp ?? null },
  );

  for (const row of logins) {
    const ip = row.ip ? ` from ${row.ip}` : "";
    const method = row.method ?? "credentials";
    pushEvent(
      events,
      method === "access" ? "ip_seen" : "login",
      row.at,
      method === "access"
        ? `Accessed from a new IP${ip}`
        : `Signed in (${method})${ip}`,
      { ip: row.ip ?? null, method },
    );
  }

  for (const s of ownedSessions) {
    pushEvent(
      events,
      "session_created",
      s.start_time,
      `Created ${s.duration_min ?? "?"} min ${s.session_type ?? "session"}`,
    );
  }
  for (const s of joinedSessions) {
    pushEvent(
      events,
      "session_joined",
      s.start_time,
      `Joined ${s.duration_min ?? "?"} min ${s.session_type ?? "session"}`,
    );
  }

  for (const fr of friendRequests) {
    const sent = fr.from_user_id === userId;
    pushEvent(
      events,
      sent ? "friend_sent" : "friend_received",
      fr.created_at,
      `${sent ? "Sent" : "Received"} friend request (${fr.status ?? "pending"})`,
    );
  }

  for (const sr of sessionRequests) {
    const sent = sr.from_user_id === userId;
    pushEvent(
      events,
      sent ? "session_request_sent" : "session_request_received",
      sr.created_at ?? sr.start,
      `${sent ? "Sent" : "Received"} session request (${sr.status ?? "pending"})`,
    );
  }

  for (const p of posts) {
    const snippet = String(p.content ?? "").slice(0, 80);
    pushEvent(events, "post", p.createdAt, snippet || "Community post");
  }
  for (const c of comments) {
    const snippet = String(c.content ?? "").slice(0, 80);
    pushEvent(events, "comment", c.createdAt, snippet || "Comment");
  }

  for (const r of reportsFiled) {
    pushEvent(
      events,
      "report_filed",
      r.createdAt,
      `Filed a report (${r.reason ?? r.targetType ?? "content"})`,
    );
  }
  for (const r of reportsReceived) {
    pushEvent(
      events,
      "report_received",
      r.createdAt,
      `Was reported (${r.reason ?? r.targetType ?? "content"})`,
    );
  }

  for (const a of audit) {
    pushEvent(
      events,
      "moderation",
      a.createdAt,
      String(a.action ?? "moderation"),
    );
  }

  for (const a of ipActivity) {
    pushEvent(
      events,
      "watched_ip_signup",
      a.createdAt,
      `Signed up from watched IP ${a.ip ?? ""}`.trim(),
      { ip: a.ip ?? null },
    );
  }

  events.sort((a, b) => b.at.localeCompare(a.at));

  return NextResponse.json({
    user: {
      id: userId,
      email: user.email ?? null,
      username: user.username ?? null,
      name:
        [user.firstname, user.lastname].filter(Boolean).join(" ") ||
        user.name ||
        null,
      signupIp: user.signupIp ?? null,
      lastLoginIp: user.lastLoginIp ?? null,
      lastSeenIp: user.lastSeenIp ?? null,
      knownIps: mergeKnownIps({
        signupIp: (user.signupIp as string | undefined) ?? null,
        lastLoginIp: (user.lastLoginIp as string | undefined) ?? null,
        lastSeenIp: (user.lastSeenIp as string | undefined) ?? null,
        knownIps: user.knownIps as
          | Array<{
              ip?: string | null;
              firstSeenAt?: Date;
              lastSeenAt?: Date;
              count?: number;
            }>
          | undefined,
      }).map((row) => ({
        ip: row.ip,
        firstSeenAt: iso(row.firstSeenAt),
        lastSeenAt: iso(row.lastSeenAt),
        count: row.count,
      })),
      lastLoginAt: iso(user.lastLoginAt),
      createdAt: iso(user.createdAt),
      emailVerified: isEmailVerified(user.emailVerified),
      communityBanned: isCommunityBanned({
        communityBannedAt: user.communityBannedAt as Date | null | undefined,
        communityMutedUntil: user.communityMutedUntil as Date | null | undefined,
      }),
      communityMuted: isCommunityMuted({
        communityBannedAt: user.communityBannedAt as Date | null | undefined,
        communityMutedUntil: user.communityMutedUntil as Date | null | undefined,
      }),
    },
    events,
  });
}
