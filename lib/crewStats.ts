import { TIME_CONFIG } from "@/constants/calendar";
import { getDb } from "@/lib/mongodb";
import { resolveEngagementCrewMembers } from "@/lib/engagementCrew";
import {
  computeInactiveDaysFromMap,
  getQualifyingEventForMember,
  type QualifyingSessionDoc,
} from "@/lib/crewQualifying";
import { getISTDayBounds } from "@/lib/sessionReminders";

const STREAK_LOOKBACK_DAYS = 365;
const CACHE_TTL_MS = 60_000;

export type CrewDayCounts = {
  date: string;
  created: number;
  deleted: number;
  joined: number;
  attended: number;
  finished: number;
  qualifying: number;
};

export type CrewMemberStats = {
  email: string;
  name: string | null;
  userId: string | null;
  today: CrewDayCounts;
  days: CrewDayCounts[];
  inactiveDays: number;
};

type CrewStatsResult = {
  days: number;
  timezone: string;
  todayKey: string;
  fromKey: string;
  toKey: string;
  members: CrewMemberStats[];
};

const crewStatsCache = new Map<
  string,
  { expiresAt: number; value: CrewStatsResult }
>();

export function clearCrewStatsCache(): void {
  crewStatsCache.clear();
}

function istDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: TIME_CONFIG.timezone });
}

function emptyDay(date: string): CrewDayCounts {
  return {
    date,
    created: 0,
    deleted: 0,
    joined: 0,
    attended: 0,
    finished: 0,
    qualifying: 0,
  };
}

function buildDayKeys(days: number, end: Date): string[] {
  const keys: string[] = [];
  const { dayKey: endKey } = getISTDayBounds(end);
  const endStart = new Date(`${endKey}T00:00:00+05:30`);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endStart.getTime() - i * 24 * 60 * 60 * 1000);
    keys.push(istDateKey(d));
  }
  return keys;
}

function rangeBounds(dayKeys: string[]): { start: Date; end: Date } {
  const start = new Date(`${dayKeys[0]}T00:00:00+05:30`);
  const last = dayKeys[dayKeys.length - 1];
  const end = new Date(
    new Date(`${last}T00:00:00+05:30`).getTime() + 24 * 60 * 60 * 1000,
  );
  return { start, end };
}

function bump(
  map: Map<string, Map<string, CrewDayCounts>>,
  userId: string,
  date: string,
  field: keyof Omit<CrewDayCounts, "date">,
) {
  let byDay = map.get(userId);
  if (!byDay) {
    byDay = new Map();
    map.set(userId, byDay);
  }
  let row = byDay.get(date);
  if (!row) {
    row = emptyDay(date);
    byDay.set(date, row);
  }
  row[field] += 1;
}

function noteFirstActivity(
  map: Map<string, string>,
  userId: string,
  dateKey: string,
) {
  const existing = map.get(userId);
  if (!existing || dateKey < existing) {
    map.set(userId, dateKey);
  }
}

function relevantUserIds(
  session: QualifyingSessionDoc,
  userIdSet: ReadonlySet<string>,
): string[] {
  const ids = new Set<string>();
  const ownerId = String(session.owner_id);
  if (userIdSet.has(ownerId)) ids.add(ownerId);
  for (const p of session.session_participants ?? []) {
    const uid = p.user_id ? String(p.user_id) : "";
    if (uid && userIdSet.has(uid)) ids.add(uid);
  }
  return [...ids];
}

function toQualifyingSession(doc: {
  _id?: unknown;
  owner_id?: unknown;
  created_at?: Date | string;
  participant_count?: number;
  session_participants?: QualifyingSessionDoc["session_participants"];
}): QualifyingSessionDoc {
  return {
    id: String(doc._id),
    owner_id: String(doc.owner_id),
    created_at: doc.created_at,
    participant_count: doc.participant_count,
    session_participants: doc.session_participants,
  };
}

async function computeCrewStats(days: number): Promise<CrewStatsResult> {
  const safeDays = Math.min(90, Math.max(1, Math.floor(days)));
  const now = new Date();
  const dayKeys = buildDayKeys(safeDays, now);
  const streakDayKeys = buildDayKeys(STREAK_LOOKBACK_DAYS, now);
  const todayKey = dayKeys[dayKeys.length - 1]!;
  const { start, end } = rangeBounds(dayKeys);
  const { start: streakStart, end: streakEnd } = rangeBounds(streakDayKeys);
  const dayKeySet = new Set(dayKeys);
  const streakDayKeySet = new Set(streakDayKeys);

  const members = await resolveEngagementCrewMembers({ writeBack: false });
  const userIds = members
    .map((m) => m.userId)
    .filter((id): id is string => Boolean(id));

  const counts = new Map<string, Map<string, CrewDayCounts>>();
  const firstActivityByUser = new Map<string, string>();

  if (userIds.length > 0) {
    const db = await getDb();
    const userIdSet = new Set(userIds);

    const padStart = new Date(streakStart.getTime() - 2 * 24 * 60 * 60 * 1000);
    const padEnd = new Date(streakEnd.getTime() + 24 * 60 * 60 * 1000);

    const [sessionDocs, deletedDocs] = await Promise.all([
      db
        .collection("sessions")
        .find(
          {
            $or: [
              {
                owner_id: { $in: userIds },
                created_at: { $gte: streakStart, $lt: streakEnd },
              },
              {
                "session_participants.user_id": { $in: userIds },
                start_time: { $gte: padStart, $lt: padEnd },
              },
            ],
          },
          {
            projection: {
              owner_id: 1,
              created_at: 1,
              participant_count: 1,
              end_time: 1,
              session_participants: 1,
            },
          },
        )
        .toArray(),
      db
        .collection("session_lifecycle_events")
        .find(
          {
            type: "session_deleted",
            userId: { $in: userIds },
            at: { $gte: streakStart, $lt: streakEnd },
          },
          { projection: { userId: 1, at: 1, sessionId: 1 } },
        )
        .toArray(),
    ]);

    const deletedByUser = new Map<string, Set<string>>();
    for (const doc of deletedDocs) {
      const uid = String(doc.userId);
      if (!userIdSet.has(uid)) continue;
      if (typeof doc.sessionId !== "string") continue;
      let set = deletedByUser.get(uid);
      if (!set) {
        set = new Set();
        deletedByUser.set(uid, set);
      }
      set.add(doc.sessionId);
    }

    const sessionById = new Map<string, QualifyingSessionDoc>();
    for (const doc of sessionDocs) {
      sessionById.set(String(doc._id), toQualifyingSession(doc));
    }

    for (const doc of sessionDocs) {
      const ownerId = String(doc.owner_id);
      if (
        userIdSet.has(ownerId) &&
        doc.created_at instanceof Date
      ) {
        const key = istDateKey(doc.created_at);
        if (streakDayKeySet.has(key)) {
          noteFirstActivity(firstActivityByUser, ownerId, key);
        }
        if (dayKeySet.has(key)) {
          bump(counts, ownerId, key, "created");
        }
      }

      const participants = (doc.session_participants ?? []) as Array<{
        user_id?: string;
        joined_at?: Date | string;
        call_joined_at?: Date | string;
        call_left_at?: Date | string;
        call_completed?: boolean;
      }>;

      for (const p of participants) {
        const uid = p.user_id ? String(p.user_id) : "";
        if (!userIdSet.has(uid)) continue;

        if (ownerId !== uid && p.joined_at) {
          const joinedAt = new Date(p.joined_at);
          if (!Number.isNaN(joinedAt.getTime())) {
            const key = istDateKey(joinedAt);
            if (streakDayKeySet.has(key)) {
              noteFirstActivity(firstActivityByUser, uid, key);
            }
            if (
              dayKeySet.has(key) &&
              joinedAt >= start &&
              joinedAt < end
            ) {
              bump(counts, uid, key, "joined");
            }
          }
        }

        if (p.call_joined_at) {
          const attendedAt = new Date(p.call_joined_at);
          if (!Number.isNaN(attendedAt.getTime())) {
            const key = istDateKey(attendedAt);
            if (streakDayKeySet.has(key)) {
              noteFirstActivity(firstActivityByUser, uid, key);
            }
            if (
              dayKeySet.has(key) &&
              attendedAt >= start &&
              attendedAt < end
            ) {
              bump(counts, uid, key, "attended");
            }
          }
        }

        if (p.call_completed) {
          const finishRaw = p.call_left_at ?? doc.end_time;
          if (finishRaw) {
            const finishedAt = new Date(finishRaw);
            if (!Number.isNaN(finishedAt.getTime())) {
              const key = istDateKey(finishedAt);
              if (
                dayKeySet.has(key) &&
                finishedAt >= start &&
                finishedAt < end
              ) {
                bump(counts, uid, key, "finished");
              }
            }
          }
        }
      }
    }

    for (const doc of deletedDocs) {
      const uid = String(doc.userId);
      if (!userIdSet.has(uid) || !(doc.at instanceof Date)) continue;
      const key = istDateKey(doc.at);
      if (!dayKeySet.has(key)) continue;
      bump(counts, uid, key, "deleted");
    }

    for (const sessionDoc of sessionById.values()) {
      for (const uid of relevantUserIds(sessionDoc, userIdSet)) {
        const deletedIds = deletedByUser.get(uid) ?? new Set<string>();
        const event = getQualifyingEventForMember(sessionDoc, uid, deletedIds);
        if (!event || !streakDayKeySet.has(event.dateKey)) continue;
        noteFirstActivity(firstActivityByUser, uid, event.dateKey);
        bump(counts, uid, event.dateKey, "qualifying");
      }
    }
  }

  const streakEarliest = streakDayKeys[0]!;

  const result: CrewMemberStats[] = members.map((m) => {
    const byDay = m.userId ? counts.get(m.userId) : undefined;
    const qualifyingByDate = new Map<string, number>();
    if (byDay) {
      for (const [date, row] of byDay.entries()) {
        if (row.qualifying > 0) qualifyingByDate.set(date, row.qualifying);
      }
    }

    const inactiveDays = m.userId
      ? computeInactiveDaysFromMap(
          qualifyingByDate,
          todayKey,
          streakEarliest,
          firstActivityByUser.get(m.userId) ?? null,
        )
      : 0;

    const series = dayKeys.map((date) => {
      const row = byDay?.get(date);
      return row ? { ...row } : emptyDay(date);
    });
    const today = series.find((d) => d.date === todayKey) ?? emptyDay(todayKey);
    return {
      email: m.email,
      name: m.name,
      userId: m.userId,
      today,
      days: series,
      inactiveDays,
    };
  });

  return {
    days: safeDays,
    timezone: TIME_CONFIG.timezone,
    todayKey,
    fromKey: dayKeys[0]!,
    toKey: todayKey,
    members: result,
  };
}

/**
 * Aggregate crew session metrics for the last `days` IST calendar days
 * ending today (inclusive). Responses are cached briefly in memory.
 */
export async function getCrewStats(days = 14): Promise<CrewStatsResult> {
  const safeDays = Math.min(90, Math.max(1, Math.floor(days)));
  const cacheKey = String(safeDays);
  const cached = crewStatsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await computeCrewStats(safeDays);
  crewStatsCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });
  return value;
}
