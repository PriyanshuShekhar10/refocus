import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { persistableIp } from "@/lib/userIps";

export type BannedIpActivityOutcome =
  | "created"
  | "rejected_email"
  | "rejected_other";

function uniqueIps(...ips: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const ip of ips) {
    const stored = persistableIp(ip);
    if (stored) set.add(stored);
  }
  return [...set];
}

export async function addBannedIpWatches(params: {
  userId: string;
  email: string | null;
  signupIp?: string | null;
  lastLoginIp?: string | null;
}): Promise<void> {
  const ips = uniqueIps(params.signupIp, params.lastLoginIp);
  if (ips.length === 0) return;

  const db = await getDb();
  const now = new Date();
  await Promise.all(
    ips.map((ip) =>
      db.collection("banned_ip_watches").updateOne(
        { ip, bannedUserId: params.userId },
        {
          $set: {
            ip,
            bannedUserId: params.userId,
            bannedUserEmail: params.email,
            createdAt: now,
          },
        },
        { upsert: true },
      ),
    ),
  );
  await db
    .collection("banned_ip_watches")
    .createIndex({ ip: 1, bannedUserId: 1 }, { unique: true })
    .catch(() => undefined);
}

export async function removeBannedIpWatchesForUser(userId: string): Promise<void> {
  const db = await getDb();
  await db.collection("banned_ip_watches").deleteMany({ bannedUserId: userId });
}

export async function logBannedIpSignupAttempt(params: {
  ip: string | null | undefined;
  attemptedEmail: string;
  outcome: BannedIpActivityOutcome;
  createdUserId?: string | null;
}): Promise<void> {
  const stored = persistableIp(params.ip);
  if (!stored) return;

  try {
    const db = await getDb();
    const watches = await db
      .collection("banned_ip_watches")
      .find({ ip: stored })
      .project({ bannedUserId: 1 })
      .toArray();
    if (watches.length === 0) return;

    await db.collection("banned_ip_activity").insertOne({
      ip: stored,
      attemptedEmail: params.attemptedEmail.trim().toLowerCase(),
      outcome: params.outcome,
      createdUserId: params.createdUserId ?? null,
      matchedBannedUserIds: watches.map((w) => String(w.bannedUserId)),
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[bannedIpWatch] Failed to log signup attempt:", err);
  }
}

export async function getBannedUserIps(userId: string): Promise<{
  signupIp: string | null;
  lastLoginIp: string | null;
}> {
  if (!ObjectId.isValid(userId)) {
    return { signupIp: null, lastLoginIp: null };
  }
  const db = await getDb();
  const user = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { signupIp: 1, lastLoginIp: 1 } },
  )) as { signupIp?: string | null; lastLoginIp?: string | null } | null;
  return {
    signupIp: user?.signupIp ?? null,
    lastLoginIp: user?.lastLoginIp ?? null,
  };
}
