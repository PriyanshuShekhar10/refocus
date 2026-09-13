import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { logSessionDeleted } from "@/lib/sessionLifecycleEvents";
import {
  publishSessionDocUpserted,
  publishSessionRemoved,
} from "@/lib/sessionRealtime";
import { resolveSessionDisplayName } from "@/lib/sessionPersonalization";
import {
  formatSessionTimeIST,
  resolveUserTimeZone,
} from "@/lib/sessionReminders";
import { getAppUrl } from "@/lib/site";
import {
  sendNoShowDayCancelledEmail,
  sendPartnerRemovedForInactivityEmail,
} from "@/lib/email/sendNoShowEmails";
import type { NoShowCancelledSessionItem } from "@/lib/email/sessionReminderTemplates";
import {
  addDaysInTimeZone,
  startOfDayInTimeZone,
  ymdInTimeZone,
} from "@/lib/zonedTime";

const NO_SHOW_EVENTS = "session_no_show_events";

type SessionParticipant = {
  user_id: string;
  joined_at?: Date | string;
  quiet?: boolean;
  label?: string | null;
  call_joined_at?: Date | string | null;
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

type UserRow = {
  _id: ObjectId;
  email?: string | null;
  firstname?: string | null;
  name?: string | null;
  preferences?: { timezone?: string };
};

export type NoShowCancelResult = {
  missesDetected: number;
  dayWipes: number;
  sessionsAffected: number;
  partnerEmails: number;
  userEmails: number;
};

function participantCount(s: SessionDoc): number {
  if (typeof s.participant_count === "number") return s.participant_count;
  return s.session_participants?.length ?? 0;
}

function displayName(user: UserRow | null | undefined): string | null {
  if (!user) return null;
  return user.firstname?.trim() || user.name?.trim() || null;
}

function sessionTitleFor(session: SessionDoc, userId: string): string {
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

function hasCallJoined(p: SessionParticipant | undefined): boolean {
  return Boolean(p?.call_joined_at);
}

/** Claim a unique event; false if already processed. */
async function claimEvent(
  db: Db,
  doc: Record<string, unknown>,
): Promise<boolean> {
  try {
    await db.collection(NO_SHOW_EVENTS).insertOne({
      ...doc,
      createdAt: new Date(),
    });
    return true;
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 11000) return false;
    throw err;
  }
}

type UnpairResult = {
  kind: "transfer" | "hard" | "leave";
  partnerId: string | null;
  session: SessionDoc;
};

async function removeUserFromOneSession(
  db: Db,
  userId: string,
  s: SessionDoc,
): Promise<UnpairResult | null> {
  const col = db.collection<SessionDoc>("sessions");
  const sessionId = String(s._id);
  const participants = s.session_participants ?? [];
  const isOwner = String(s.owner_id) === String(userId);
  const isParticipant = participants.some(
    (p) => String(p.user_id) === String(userId),
  );
  if (!isOwner && !isParticipant) return null;

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
      await logSessionDeleted({ userId, sessionId, kind: "transfer" });
      const updated = await col.findOne({ _id: s._id });
      if (updated) {
        await publishSessionDocUpserted(db, {
          ...updated,
          duration_min: updated.duration_min ?? 50,
          session_type: updated.session_type ?? "focus",
        });
      }
      return {
        kind: "transfer",
        partnerId: newOwnerId,
        session: updated ?? s,
      };
    }

    await col.deleteOne({ _id: s._id });
    await logSessionDeleted({ userId, sessionId, kind: "hard" });
    await publishSessionRemoved(sessionId);
    return { kind: "hard", partnerId: null, session: s };
  }

  const partnerId =
    participants
      .map((p) => String(p.user_id))
      .find((id) => id !== String(userId)) ?? null;
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
    await publishSessionDocUpserted(db, {
      ...updated,
      duration_min: updated.duration_min ?? 50,
      session_type: updated.session_type ?? "focus",
    });
  }
  return {
    kind: "leave",
    partnerId,
    session: updated ?? s,
  };
}

/**
 * After booked sessions end without a join, cancel the no-show user's
 * remaining sessions for that local calendar day and notify partners.
 */
export async function runSessionNoShowCancellations(options?: {
  lookbackMinutes?: number;
  now?: Date;
  db?: Db;
}): Promise<NoShowCancelResult> {
  const database = options?.db ?? (await getDb());
  const now = options?.now ?? new Date();
  const lookbackMinutes = options?.lookbackMinutes ?? 90;
  const windowStart = new Date(now.getTime() - lookbackMinutes * 60_000);

  const result: NoShowCancelResult = {
    missesDetected: 0,
    dayWipes: 0,
    sessionsAffected: 0,
    partnerEmails: 0,
    userEmails: 0,
  };

  // Ensure unique indexes (idempotent; ignore if already present).
  try {
    await database.collection(NO_SHOW_EVENTS).createIndex(
      { type: 1, sessionId: 1, userId: 1 },
      { unique: true, partialFilterExpression: { type: "miss" }, name: "noshow_miss_uniq" },
    );
    await database.collection(NO_SHOW_EVENTS).createIndex(
      { type: 1, userId: 1, localDate: 1 },
      {
        unique: true,
        partialFilterExpression: { type: "day_wipe" },
        name: "noshow_day_wipe_uniq",
      },
    );
  } catch (err) {
    console.warn("[no-show] index ensure warning:", err);
  }

  const ended = await database
    .collection<SessionDoc>("sessions")
    .find({
      end_time: { $gt: windowStart, $lte: now },
      $or: [
        { participant_count: { $gte: 2 } },
        {
          participant_count: { $exists: false },
          "session_participants.1": { $exists: true },
        },
      ],
    })
    .limit(200)
    .toArray();

  type MissWork = {
    userId: string;
    missed: SessionDoc;
  };
  const misses: MissWork[] = [];

  for (const s of ended) {
    if (participantCount(s) < 2) continue;
    for (const p of s.session_participants ?? []) {
      if (hasCallJoined(p)) continue;
      const userId = String(p.user_id);
      const claimed = await claimEvent(database, {
        type: "miss",
        sessionId: String(s._id),
        userId,
      });
      if (!claimed) continue;
      result.missesDetected += 1;
      misses.push({ userId, missed: s });
    }
  }

  // Group by user so one day wipe + one summary email per user.
  const byUser = new Map<string, MissWork[]>();
  for (const m of misses) {
    const list = byUser.get(m.userId) ?? [];
    list.push(m);
    byUser.set(m.userId, list);
  }

  for (const [userId, userMisses] of byUser) {
    const missed = userMisses[0]!.missed;
    const user = (await database.collection<UserRow>("users").findOne(
      ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId as unknown as ObjectId },
      { projection: { email: 1, firstname: 1, name: 1, preferences: 1 } },
    )) as UserRow | null;

    const tz = resolveUserTimeZone(user?.preferences);
    const localDate = ymdInTimeZone(new Date(missed.end_time), tz);
    const dayStart = startOfDayInTimeZone(new Date(missed.end_time), tz);
    const dayEnd = addDaysInTimeZone(dayStart, 1, tz);

    const wipeClaimed = await claimEvent(database, {
      type: "day_wipe",
      userId,
      localDate,
      triggerSessionId: String(missed._id),
    });
    if (!wipeClaimed) continue;
    result.dayWipes += 1;

    const remaining = await database
      .collection<SessionDoc>("sessions")
      .find({
        end_time: { $gt: now },
        start_time: { $gte: dayStart, $lt: dayEnd },
        $or: [
          { owner_id: userId },
          { "session_participants.user_id": userId },
        ],
      })
      .limit(100)
      .toArray();

    const cancelledForEmail: NoShowCancelledSessionItem[] = [];
    const calendarUrl = `${getAppUrl()}/sessions`;
    const removedLabel = displayName(user) || "Your partner";

    for (const s of remaining) {
      const beforeTitle = sessionTitleFor(s, userId);
      const beforeStarts = formatSessionTimeIST(new Date(s.start_time), tz);
      const unpair = await removeUserFromOneSession(database, userId, s);
      if (!unpair) continue;
      result.sessionsAffected += 1;
      cancelledForEmail.push({
        title: beforeTitle,
        startsAtLabel: beforeStarts,
      });

      if (unpair.partnerId) {
        const partner = (await database.collection<UserRow>("users").findOne(
          ObjectId.isValid(unpair.partnerId)
            ? { _id: new ObjectId(unpair.partnerId) }
            : { _id: unpair.partnerId as unknown as ObjectId },
          { projection: { email: 1, firstname: 1, name: 1, preferences: 1 } },
        )) as UserRow | null;
        const partnerEmail = partner?.email?.trim();
        if (partnerEmail) {
          const partnerTz = resolveUserTimeZone(partner?.preferences);
          try {
            const sent = await sendPartnerRemovedForInactivityEmail({
              email: partnerEmail,
              firstName: displayName(partner),
              removedName: removedLabel,
              sessionTitle: sessionTitleFor(unpair.session, unpair.partnerId),
              startsAtLabel: formatSessionTimeIST(
                new Date(unpair.session.start_time),
                partnerTz,
              ),
              calendarUrl,
            });
            if (sent.sent) result.partnerEmails += 1;
          } catch (err) {
            console.error("[no-show] partner email failed:", err);
          }
        }
      }
    }

    const userEmail = user?.email?.trim();
    if (userEmail) {
      try {
        const sent = await sendNoShowDayCancelledEmail({
          email: userEmail,
          firstName: displayName(user),
          missedSessionTitle: sessionTitleFor(missed, userId),
          missedStartsAtLabel: formatSessionTimeIST(
            new Date(missed.start_time),
            tz,
          ),
          cancelledSessions: cancelledForEmail,
          calendarUrl,
        });
        if (sent.sent) result.userEmails += 1;
      } catch (err) {
        console.error("[no-show] user summary email failed:", err);
      }
    }
  }

  return result;
}
