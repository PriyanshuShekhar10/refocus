import { getDb } from "@/lib/mongodb";

const PRESENCE_TTL_MS = 3 * 60 * 60 * 1000;

export type PushPresence = {
  userId: string;
  inCall: boolean;
  sessionId: string | null;
  updatedAt: Date;
};

export async function setPushPresence(input: {
  userId: string;
  inCall: boolean;
  sessionId?: string | null;
}) {
  const db = await getDb();
  const now = new Date();
  await db.collection("push_presence").updateOne(
    { userId: input.userId },
    {
      $set: {
        userId: input.userId,
        inCall: input.inCall,
        sessionId: input.sessionId ?? null,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}

export async function getFreshPushPresence(
  userId: string,
  now = new Date(),
): Promise<PushPresence | null> {
  const db = await getDb();
  const row = (await db.collection("push_presence").findOne({
    userId,
  })) as PushPresence | null;
  if (!row) return null;
  const updatedAt = new Date(row.updatedAt);
  if (now.getTime() - updatedAt.getTime() > PRESENCE_TTL_MS) {
    return null;
  }
  return {
    userId: row.userId,
    inCall: Boolean(row.inCall),
    sessionId: row.sessionId ?? null,
    updatedAt,
  };
}

export async function isUserInCall(
  userId: string,
  now = new Date(),
): Promise<boolean> {
  const presence = await getFreshPushPresence(userId, now);
  return Boolean(presence?.inCall);
}

export async function isUserInSession(
  userId: string,
  sessionId: string,
  now = new Date(),
): Promise<boolean> {
  const presence = await getFreshPushPresence(userId, now);
  return Boolean(presence?.inCall && presence.sessionId === sessionId);
}

export { PRESENCE_TTL_MS };
