import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { logSessionDeleted } from "@/lib/sessionLifecycleEvents";
import {
  publishSessionDocUpserted,
  publishSessionRemoved,
} from "@/lib/sessionRealtime";

type SessionParticipant = {
  user_id: string;
  joined_at?: Date | string;
  quiet?: boolean;
  label?: string | null;
  call_joined_at?: Date | string;
  call_completed?: boolean;
};

type SessionDoc = {
  _id: ObjectId;
  owner_id: string;
  start_time: Date;
  end_time: Date;
  duration_min?: number;
  session_type?: string;
  status?: string;
  name?: string | null;
  color?: string | null;
  session_participants?: SessionParticipant[];
  participant_count?: number;
};

export type RemoveFromSessionsResult = {
  /** Non-owner seats cleared (partner keeps the open slot). */
  left: number;
  /** Solo owned slots hard-deleted. */
  deleted: number;
  /** Matched owned slots transferred to the partner. */
  transferred: number;
};

/**
 * Pull a banned user out of every session that has not ended yet
 * (upcoming + in progress). Mirrors leave / cancel semantics so partners
 * keep a usable open slot when possible.
 */
export async function removeUserFromOngoingSessions(
  userId: string,
  db?: Db,
): Promise<RemoveFromSessionsResult> {
  const database = db ?? (await getDb());
  const col = database.collection<SessionDoc>("sessions");
  const now = new Date();

  const sessions = await col
    .find({
      end_time: { $gte: now },
      $or: [
        { owner_id: userId },
        { "session_participants.user_id": userId },
      ],
    })
    .limit(200)
    .toArray();

  let left = 0;
  let deleted = 0;
  let transferred = 0;

  for (const s of sessions) {
    const sessionId = String(s._id);
    const participants = s.session_participants ?? [];
    const isOwner = String(s.owner_id) === String(userId);
    const isParticipant = participants.some(
      (p) => String(p.user_id) === String(userId),
    );
    if (!isOwner && !isParticipant) continue;

    if (isOwner) {
      const others = participants.filter(
        (p) => String(p.user_id) !== String(userId),
      );
      if (others.length >= 1) {
        const newOwnerId = String(others[0]!.user_id);
        const newParticipants = participants.filter(
          (p) => String(p.user_id) === newOwnerId,
        );
        await col.updateOne(
          { _id: s._id },
          {
            $set: {
              owner_id: newOwnerId,
              session_participants: newParticipants,
              participant_count: newParticipants.length,
              status: "available",
              updated_at: new Date(),
            },
          },
        );
        await logSessionDeleted({
          userId,
          sessionId,
          kind: "transfer",
        });
        const updated = await col.findOne({ _id: s._id });
        if (updated) {
          await publishSessionDocUpserted(database, {
            ...updated,
            duration_min: updated.duration_min ?? 50,
            session_type: updated.session_type ?? "focus",
          });
        }
        transferred += 1;
      } else {
        await col.deleteOne({ _id: s._id });
        await logSessionDeleted({
          userId,
          sessionId,
          kind: "hard",
        });
        await publishSessionRemoved(sessionId);
        deleted += 1;
      }
      continue;
    }

    const newParticipants = participants.filter(
      (p) => String(p.user_id) !== String(userId),
    );
    await col.updateOne(
      { _id: s._id },
      {
        $set: {
          session_participants: newParticipants,
          participant_count: newParticipants.length,
          status: "available",
          updated_at: new Date(),
        },
      },
    );
    const updated = await col.findOne({ _id: s._id });
    if (updated) {
      await publishSessionDocUpserted(database, {
        ...updated,
        duration_min: updated.duration_min ?? 50,
        session_type: updated.session_type ?? "focus",
      });
    }
    left += 1;
  }

  return { left, deleted, transferred };
}
