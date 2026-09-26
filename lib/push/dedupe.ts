import { getDb } from "@/lib/mongodb";
import type { PushType } from "@/lib/push/types";

/**
 * Insert-once dedupe. Returns true when this delivery should proceed.
 */
export async function markPushDelivery(input: {
  userId: string;
  kind: PushType | string;
  dedupeKey: string;
}): Promise<boolean> {
  const db = await getDb();
  try {
    await db.collection("push_deliveries").insertOne({
      userId: input.userId,
      kind: input.kind,
      dedupeKey: input.dedupeKey,
      sentAt: new Date(),
    });
    return true;
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 11000) return false;
    throw err;
  }
}
