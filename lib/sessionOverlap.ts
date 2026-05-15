import type { Db } from "mongodb";
import { ObjectId } from "mongodb";

/**
 * Returns true if `userId` is already a participant in a session whose
 * time range overlaps [start, end). When `excludeSessionId` is provided,
 * that session is ignored (useful when re-checking the slot the user is
 * about to join).
 */
export async function hasSessionOverlap(
  db: Db,
  userId: string,
  start: Date,
  end: Date,
  excludeSessionId?: string,
): Promise<boolean> {
  const query: Record<string, unknown> = {
    "session_participants.user_id": userId,
    start_time: { $lt: end },
    end_time: { $gt: start },
  };
  if (excludeSessionId && ObjectId.isValid(excludeSessionId)) {
    query._id = { $ne: new ObjectId(excludeSessionId) };
  }
  const conflict = await db.collection("sessions").findOne(query, {
    projection: { _id: 1 },
  });
  return !!conflict;
}
