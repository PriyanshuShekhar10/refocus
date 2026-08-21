import { TIME_CONFIG } from "@/constants/calendar";
import { getDb } from "@/lib/mongodb";
import { resolveEngagementCrewMembers } from "@/lib/engagementCrew";
import { getISTDayBounds } from "@/lib/sessionReminders";

export type CrewDayCounts = {
  date: string;
  created: number;
  deleted: number;
  joined: number;
  attended: number;
  finished: number;
};

export type CrewMemberStats = {
  email: string;
  name: string | null;
  userId: string | null;
  today: CrewDayCounts;
  days: CrewDayCounts[];
};

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

/**
 * Aggregate crew session metrics for the last `days` IST calendar days
 * ending today (inclusive).
 */
export async function getCrewStats(days = 14): Promise<{
  days: number;
  timezone: string;
  todayKey: string;
  members: CrewMemberStats[];
}> {
  const safeDays = Math.min(90, Math.max(1, Math.floor(days)));
  const now = new Date();
  const dayKeys = buildDayKeys(safeDays, now);
  const todayKey = dayKeys[dayKeys.length - 1];
  const { start, end } = rangeBounds(dayKeys);
  const dayKeySet = new Set(dayKeys);

  const members = await resolveEngagementCrewMembers();
  const userIds = members
    .map((m) => m.userId)
    .filter((id): id is string => Boolean(id));

  const counts = new Map<string, Map<string, CrewDayCounts>>();

  if (userIds.length > 0) {
    const db = await getDb();
    const userIdSet = new Set(userIds);

    const padStart = new Date(start.getTime() - 2 * 24 * 60 * 60 * 1000);
    const padEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);

    const [createdDocs, deletedDocs, participantDocs] = await Promise.all([
      db
        .collection("sessions")
        .find(
          {
            owner_id: { $in: userIds },
            created_at: { $gte: start, $lt: end },
          },
          { projection: { owner_id: 1, created_at: 1 } },
        )
        .toArray(),
      db
        .collection("session_lifecycle_events")
        .find(
          {
            type: "session_deleted",
            userId: { $in: userIds },
            at: { $gte: start, $lt: end },
          },
          { projection: { userId: 1, at: 1 } },
        )
        .toArray(),
      db
        .collection("sessions")
        .find(
          {
            "session_participants.user_id": { $in: userIds },
            start_time: { $gte: padStart, $lt: padEnd },
          },
          {
            projection: {
              owner_id: 1,
              end_time: 1,
              session_participants: 1,
            },
          },
        )
        .toArray(),
    ]);

    for (const doc of createdDocs) {
      const ownerId = String(doc.owner_id);
      if (!userIdSet.has(ownerId) || !(doc.created_at instanceof Date)) continue;
      const key = istDateKey(doc.created_at);
      if (!dayKeySet.has(key)) continue;
      bump(counts, ownerId, key, "created");
    }

    for (const doc of deletedDocs) {
      const uid = String(doc.userId);
      if (!userIdSet.has(uid) || !(doc.at instanceof Date)) continue;
      const key = istDateKey(doc.at);
      if (!dayKeySet.has(key)) continue;
      bump(counts, uid, key, "deleted");
    }

    for (const doc of participantDocs) {
      const ownerId = String(doc.owner_id);
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
  }

  const result: CrewMemberStats[] = members.map((m) => {
    const byDay = m.userId ? counts.get(m.userId) : undefined;
    const series = dayKeys.map((date) => {
      const row = byDay?.get(date);
      return row
        ? { ...row }
        : emptyDay(date);
    });
    const today = series.find((d) => d.date === todayKey) ?? emptyDay(todayKey);
    return {
      email: m.email,
      name: m.name,
      userId: m.userId,
      today,
      days: series,
    };
  });

  return {
    days: safeDays,
    timezone: TIME_CONFIG.timezone,
    todayKey,
    members: result,
  };
}
