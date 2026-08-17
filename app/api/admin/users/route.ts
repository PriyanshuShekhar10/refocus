import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin, ADMIN_ROLE } from "@/lib/admin";
import { isEmailVerified } from "@/lib/emailVerification";
import {
  isCommunityBanned,
  isCommunityMuted,
} from "@/lib/communityModeration";
import { mergeKnownIps } from "@/lib/userIps";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);
  const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);

  const db = await getDb();
  const filter: Record<string, unknown> = {};

  if (q) {
    filter.$or = [
      { email: { $regex: q, $options: "i" } },
      { username: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } },
      { firstname: { $regex: q, $options: "i" } },
      { lastname: { $regex: q, $options: "i" } },
      { signupIp: { $regex: q, $options: "i" } },
      { lastLoginIp: { $regex: q, $options: "i" } },
      { lastSeenIp: { $regex: q, $options: "i" } },
      { "knownIps.ip": { $regex: q, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    db
      .collection("users")
      .find(filter)
      .project({
        email: 1,
        username: 1,
        name: 1,
        firstname: 1,
        lastname: 1,
        emailVerified: 1,
        createdAt: 1,
        avatar_url: 1,
        image: 1,
        role: 1,
        communityBannedAt: 1,
        communityMutedUntil: 1,
        signupIp: 1,
        lastLoginIp: 1,
        lastLoginAt: 1,
        lastSeenIp: 1,
        knownIps: 1,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("users").countDocuments(filter),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      id: String(u._id),
      email: u.email ?? null,
      username: u.username ?? null,
      name:
        [u.firstname, u.lastname].filter(Boolean).join(" ") ||
        u.name ||
        null,
      emailVerified: isEmailVerified(u.emailVerified),
      createdAt: u.createdAt
        ? new Date(u.createdAt as Date).toISOString()
        : null,
      hasAvatar: Boolean(u.avatar_url || u.image),
      isAdmin: u.role === ADMIN_ROLE,
      communityBanned: isCommunityBanned(u),
      communityMuted: isCommunityMuted(u),
      signupIp: (u.signupIp as string | undefined) ?? null,
      lastLoginIp: (u.lastLoginIp as string | undefined) ?? null,
      lastSeenIp: (u.lastSeenIp as string | undefined) ?? null,
      knownIps: mergeKnownIps({
        signupIp: (u.signupIp as string | undefined) ?? null,
        lastLoginIp: (u.lastLoginIp as string | undefined) ?? null,
        lastSeenIp: (u.lastSeenIp as string | undefined) ?? null,
        knownIps: u.knownIps as
          | Array<{
              ip?: string | null;
              firstSeenAt?: Date;
              lastSeenAt?: Date;
              count?: number;
            }>
          | undefined,
      }).map((row) => row.ip),
      lastLoginAt: u.lastLoginAt
        ? new Date(u.lastLoginAt as Date).toISOString()
        : null,
    })),
    total,
    skip,
    limit,
  });
}
