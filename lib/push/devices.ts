import { getDb } from "@/lib/mongodb";
import type { PushPlatform } from "@/lib/push/types";

export type PushDevice = {
  userId: string;
  token: string;
  platform: PushPlatform;
  updatedAt: Date;
};

const EXPO_TOKEN_RE = /^ExponentPushToken\[.+\]$/;

export function isValidExpoPushToken(token: string) {
  return EXPO_TOKEN_RE.test(token.trim());
}

export function isValidPushPlatform(value: unknown): value is PushPlatform {
  return value === "ios" || value === "android";
}

export async function upsertPushDevice(input: {
  userId: string;
  token: string;
  platform: PushPlatform;
}) {
  const db = await getDb();
  const token = input.token.trim();
  const now = new Date();
  await db.collection("push_devices").updateOne(
    { token },
    {
      $set: {
        userId: input.userId,
        token,
        platform: input.platform,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

export async function deletePushDevice(userId: string, token: string) {
  const db = await getDb();
  await db.collection("push_devices").deleteOne({
    userId,
    token: token.trim(),
  });
}

export async function deletePushDeviceByToken(token: string) {
  const db = await getDb();
  await db.collection("push_devices").deleteOne({ token: token.trim() });
}

export async function listPushTokensForUser(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .collection<PushDevice>("push_devices")
    .find({ userId })
    .project({ token: 1 })
    .toArray();
  return rows.map((row) => row.token).filter(Boolean);
}
