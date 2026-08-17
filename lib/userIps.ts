import { after } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { canonicalEmail } from "@/lib/normalizeEmail";
import { getClientIp } from "@/lib/ratelimit";

export type LoginMethod = "credentials" | "google" | "access";

export type KnownIpEntry = {
  ip: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  count: number;
};

/** Cap so a single account cannot grow an unbounded IP list. */
export const MAX_KNOWN_IPS = 50;

/** Skip rewriting the same IP if it was already recorded this recently. */
export const SAME_IP_THROTTLE_MS = 60 * 60 * 1000;

/** IPs we should not persist (local/dev / missing). */
export function persistableIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (
    !trimmed ||
    trimmed === "127.0.0.1" ||
    trimmed === "::1" ||
    trimmed === "0.0.0.0" ||
    trimmed === "localhost"
  ) {
    return null;
  }
  return trimmed;
}

export function mergeKnownIps(user: {
  signupIp?: string | null;
  lastLoginIp?: string | null;
  lastSeenIp?: string | null;
  knownIps?: Array<{
    ip?: string | null;
    firstSeenAt?: Date | string | null;
    lastSeenAt?: Date | string | null;
    count?: number | null;
  }> | null;
}): KnownIpEntry[] {
  const map = new Map<string, KnownIpEntry>();

  for (const row of user.knownIps ?? []) {
    const ip = persistableIp(row.ip);
    if (!ip) continue;
    const first = toDate(row.firstSeenAt) ?? new Date(0);
    const last = toDate(row.lastSeenAt) ?? first;
    map.set(ip, {
      ip,
      firstSeenAt: first,
      lastSeenAt: last,
      count: typeof row.count === "number" && row.count > 0 ? row.count : 1,
    });
  }

  for (const ip of [user.signupIp, user.lastLoginIp, user.lastSeenIp]) {
    const stored = persistableIp(ip);
    if (!stored || map.has(stored)) continue;
    map.set(stored, {
      ip: stored,
      firstSeenAt: new Date(0),
      lastSeenAt: new Date(0),
      count: 1,
    });
  }

  return [...map.values()].sort(
    (a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime(),
  );
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function recordSignupIp(
  userId: string,
  ip: string | null | undefined,
): Promise<void> {
  const stored = persistableIp(ip);
  if (!stored || !ObjectId.isValid(userId)) return;
  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId), signupIp: { $exists: false } },
    { $set: { signupIp: stored } },
  );
  await recordSeenIp({ userId, ip: stored, source: "signup" });
}

export async function recordLoginIp(params: {
  userId: string;
  ip: string | null | undefined;
  method: Exclude<LoginMethod, "access">;
  email?: string | null;
}): Promise<void> {
  if (!ObjectId.isValid(params.userId)) return;
  const stored = persistableIp(params.ip);
  const db = await getDb();
  const now = new Date();
  const userId = new ObjectId(params.userId);

  const $set: Record<string, unknown> = { lastLoginAt: now };
  if (stored) $set.lastLoginIp = stored;
  if (params.email) $set.canonicalEmail = canonicalEmail(params.email);

  await db.collection("users").updateOne({ _id: userId }, { $set });
  await recordSeenIp({
    userId: params.userId,
    ip: stored,
    source: "login",
    at: now,
  });

  await db.collection("user_login_events").insertOne({
    userId: params.userId,
    ip: stored,
    at: now,
    method: params.method,
  });
}

/**
 * Upsert this IP onto the user's known-IP list. Used on login and on later
 * authenticated access so a session that started on another network still
 * gets recorded.
 */
export async function recordSeenIp(params: {
  userId: string;
  ip: string | null | undefined;
  source: "signup" | "login" | "access";
  at?: Date;
}): Promise<{ isNew: boolean }> {
  const stored = persistableIp(params.ip);
  if (!stored || !ObjectId.isValid(params.userId)) return { isNew: false };

  const db = await getDb();
  const now = params.at ?? new Date();
  const userId = new ObjectId(params.userId);
  const col = db.collection("users");

  const current = (await col.findOne(
    { _id: userId },
    { projection: { lastSeenIp: 1, lastSeenAt: 1, "knownIps.ip": 1 } },
  )) as {
    lastSeenIp?: string | null;
    lastSeenAt?: Date | null;
    knownIps?: Array<{ ip?: string }>;
  } | null;

  const alreadyKnown = (current?.knownIps ?? []).some((row) => row.ip === stored);
  const sameAsLast =
    current?.lastSeenIp === stored &&
    current.lastSeenAt != null &&
    now.getTime() - new Date(current.lastSeenAt).getTime() < SAME_IP_THROTTLE_MS;

  if (alreadyKnown && sameAsLast && params.source === "access") {
    return { isNew: false };
  }

  if (alreadyKnown) {
    await col.updateOne(
      { _id: userId, "knownIps.ip": stored },
      {
        $set: {
          lastSeenIp: stored,
          lastSeenAt: now,
          "knownIps.$.lastSeenAt": now,
        },
        $inc: { "knownIps.$.count": 1 },
      },
    );
    return { isNew: false };
  }

  await col.updateOne(
    { _id: userId, "knownIps.ip": { $ne: stored } },
    {
      $set: { lastSeenIp: stored, lastSeenAt: now },
      $push: {
        knownIps: {
          $each: [
            {
              ip: stored,
              firstSeenAt: now,
              lastSeenAt: now,
              count: 1,
            },
          ],
          $slice: -MAX_KNOWN_IPS,
        },
      } as never,
    },
  );

  if (params.source === "access") {
    await db.collection("user_login_events").insertOne({
      userId: params.userId,
      ip: stored,
      at: now,
      method: "access",
    });
  }

  return { isNew: true };
}

/** Record the request IP after the response is sent. */
export function scheduleRecordAccessIp(req: Request, userId: string): void {
  const ip = getClientIp(req);
  after(() =>
    recordSeenIp({ userId, ip, source: "access" }).catch((err) => {
      console.error("[userIps] recordSeenIp failed:", err);
    }),
  );
}
