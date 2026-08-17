import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { canonicalEmail } from "@/lib/normalizeEmail";

export type LoginMethod = "credentials" | "google";

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
}

export async function recordLoginIp(params: {
  userId: string;
  ip: string | null | undefined;
  method: LoginMethod;
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

  await db.collection("user_login_events").insertOne({
    userId: params.userId,
    ip: stored,
    at: now,
    method: params.method,
  });
}
