import { ObjectId, type Db } from "mongodb";
import { sendMatchedSessionEmail } from "@/lib/email/sendMatchedSessionEmail";
import {
  formatSessionTimeIST,
  markReminderSent,
  sessionJoinUrl,
} from "@/lib/sessionReminders";
import { resolveSessionDisplayName } from "@/lib/sessionPersonalization";

type Participant = { user_id: string; joined_at?: Date | string; quiet?: boolean };

type SessionLike = {
  _id: ObjectId | string;
  owner_id: string;
  start_time: Date | string;
  end_time?: Date | string;
  duration_min?: number;
  session_type?: string;
  name?: string | null;
  session_participants?: Participant[];
};

type UserRow = {
  _id: ObjectId;
  email?: string | null;
  firstname?: string | null;
  name?: string | null;
  preferences?: { timezone?: string };
};

function displayName(user: UserRow | null | undefined): string | null {
  if (!user) return null;
  return user.firstname?.trim() || user.name?.trim() || null;
}

function sessionTitleFor(session: SessionLike, userId: string): string {
  const personal = resolveSessionDisplayName(
    {
      name: session.name,
      owner_id: session.owner_id,
      session_participants: session.session_participants,
    },
    userId,
  );
  if (personal) return personal;
  const type = (session.session_type ?? "focus").replace("-", " ");
  return `${type} · ${session.duration_min ?? 50} min`;
}

async function hasPriorMatchedSession(
  db: Db,
  userId: string,
  excludeSessionId: string,
): Promise<boolean> {
  const prior = await db.collection("sessions").findOne(
    {
      _id: { $ne: new ObjectId(excludeSessionId) },
      "session_participants.user_id": userId,
      $or: [
        { participant_count: { $gte: 2 } },
        { "session_participants.1": { $exists: true } },
      ],
    },
    { projection: { _id: 1 } },
  );
  return Boolean(prior);
}

/**
 * Email both participants when a session becomes booked (2 people).
 * Join notifications are transactional (not gated on reminder prefs).
 * Fire-and-forget safe: never throws to the request path.
 */
export async function notifySessionMatched(
  db: Db,
  session: SessionLike,
): Promise<void> {
  try {
    const sessionId = String(session._id);
    const ownerId = String(session.owner_id);
    const participants = (session.session_participants ?? []).map((p) =>
      String(p.user_id),
    );
    if (participants.length < 2) return;

    const objectIds = participants
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const users = (await db
      .collection<UserRow>("users")
      .find({ _id: { $in: objectIds } })
      .project({ email: 1, firstname: 1, name: 1, preferences: 1 })
      .toArray()) as UserRow[];

    const byId = new Map(users.map((u) => [String(u._id), u]));
    const start = new Date(session.start_time);

    await Promise.all(
      participants.map(async (userId) => {
        const user = byId.get(userId);
        const email = user?.email?.trim();
        if (!email) return;

        const marked = await markReminderSent({
          userId,
          kind: "matched",
          dedupeKey: `matched:${sessionId}:${userId}`,
        });
        if (!marked) return;

        const partnerId = participants.find((id) => id !== userId) ?? null;
        const partner = partnerId ? byId.get(partnerId) : null;
        const tz =
          user?.preferences?.timezone && user.preferences.timezone !== "auto"
            ? user.preferences.timezone
            : "Asia/Kolkata";

        const isFirstMatch = !(await hasPriorMatchedSession(
          db,
          userId,
          sessionId,
        ));

        await sendMatchedSessionEmail({
          email,
          firstName: displayName(user),
          partnerLabel: displayName(partner),
          sessionTitle: sessionTitleFor(session, userId),
          startsAtLabel: formatSessionTimeIST(start, tz),
          joinUrl: sessionJoinUrl(sessionId),
          isFirstMatch,
          isHost: userId === ownerId,
        });
      }),
    );
  } catch (err) {
    console.error("[email] notifySessionMatched failed:", err);
  }
}
