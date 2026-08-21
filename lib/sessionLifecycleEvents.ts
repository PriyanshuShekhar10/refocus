import { getDb } from "@/lib/mongodb";

export type SessionLifecycleEventType = "session_deleted";

export type SessionDeletedKind = "hard" | "transfer";

export async function logSessionDeleted(params: {
  userId: string;
  sessionId: string;
  kind: SessionDeletedKind;
  at?: Date;
}): Promise<void> {
  const db = await getDb();
  await db.collection("session_lifecycle_events").insertOne({
    type: "session_deleted" satisfies SessionLifecycleEventType,
    userId: params.userId,
    sessionId: params.sessionId,
    kind: params.kind,
    at: params.at ?? new Date(),
  });
  await db
    .collection("session_lifecycle_events")
    .createIndex({ userId: 1, type: 1, at: 1 })
    .catch(() => undefined);
}
