import { ObjectId } from "mongodb";

export function toObjectId(id: unknown): ObjectId | null {
  return typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export function isOwnerOrParticipant(
  session: { owner_id: string; session_participants?: Array<{ user_id: string }> },
  userId: string,
): boolean {
  if (String(session.owner_id) === String(userId)) return true;
  return (session.session_participants ?? []).some(
    (participant) => String(participant.user_id) === String(userId),
  );
}
