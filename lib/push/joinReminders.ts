import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { notifySessionReminderPush } from "@/lib/push/notify";
import { formatPushName } from "@/lib/push/names";
import {
  findSessionsStartingInRange,
  isMatchedSessionParticipants,
  resolveUserTimeZone,
  toReminderItems,
} from "@/lib/sessionReminders";

export type JoinReminderRunResult = {
  recipients: number;
  sent: number;
  skipped: number;
  failed: number;
};

type UserPrefs = {
  _id: ObjectId;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  username?: string | null;
  preferences?: {
    pushSessionReminders?: boolean;
    timezone?: string;
  };
};

/**
 * Sessions whose start is 8-12 minutes ahead (tight window for a every-10-minute cron).
 */
export function joinReminderWindow(now = new Date()) {
  const from = new Date(now.getTime() + 8 * 60 * 1000);
  const to = new Date(now.getTime() + 12 * 60 * 1000);
  return { from, to };
}

export async function runPushJoinReminders(
  now = new Date(),
): Promise<JoinReminderRunResult> {
  const result: JoinReminderRunResult = {
    recipients: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  const { from, to } = joinReminderWindow(now);
  const sessions = await findSessionsStartingInRange(from, to, now);
  if (sessions.length === 0) return result;

  const userIds = new Set<string>();
  for (const s of sessions) {
    if (!isMatchedSessionParticipants(s.session_participants)) continue;
    if (s.owner_id) userIds.add(String(s.owner_id));
    for (const p of s.session_participants ?? []) {
      userIds.add(String(p.user_id));
    }
  }

  const db = await getDb();
  const objectIds = [...userIds]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  const users = (await db
    .collection<UserPrefs>("users")
    .find({ _id: { $in: objectIds } })
    .project({ firstname: 1, lastname: 1, name: 1, username: 1, preferences: 1 })
    .toArray()) as UserPrefs[];
  const byId = new Map(users.map((u) => [String(u._id), u]));

  for (const session of sessions) {
    if (!isMatchedSessionParticipants(session.session_participants)) continue;
    const participantIds = new Set<string>();
    if (session.owner_id) participantIds.add(String(session.owner_id));
    for (const p of session.session_participants ?? []) {
      participantIds.add(String(p.user_id));
    }

    for (const userId of participantIds) {
      const user = byId.get(userId);
      if (!user || user.preferences?.pushSessionReminders === false) {
        result.skipped += 1;
        continue;
      }
      result.recipients += 1;

      const items = await toReminderItems([session], userId);
      const item = items[0];
      const partnerName =
        item?.partnerLabel ??
        formatPushName(
          [...participantIds]
            .filter((id) => id !== userId)
            .map((id) => byId.get(id) ?? null)[0],
          "your partner",
        );

      const sendResult = await notifySessionReminderPush({
        userId,
        sessionId: String(session._id),
        partnerName,
        start: session.start_time,
        durationMin: session.duration_min,
        timeZone: resolveUserTimeZone(user.preferences),
      });

      if (!sendResult) {
        result.skipped += 1;
      } else if (sendResult.skipped) {
        result.skipped += 1;
      } else if (sendResult.sent > 0) {
        result.sent += 1;
      } else {
        result.failed += 1;
      }
    }
  }

  return result;
}
