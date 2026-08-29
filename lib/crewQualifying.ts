import { TIME_CONFIG } from "@/constants/calendar";

export type QualifyingDayCount = {
  date: string;
  qualifying: number;
};

export type QualifyingSessionDoc = {
  id: string;
  owner_id: string;
  created_at?: Date | string | null;
  participant_count?: number;
  session_participants?: Array<{
    user_id?: string;
    joined_at?: Date | string | null;
    call_joined_at?: Date | string | null;
  }>;
};

function istDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: TIME_CONFIG.timezone });
}

export function isSessionMatched(
  session: Pick<QualifyingSessionDoc, "participant_count" | "session_participants">,
): boolean {
  const participants = (session.session_participants ?? []).filter(
    (p) => p.user_id,
  );
  if (participants.length > 0) {
    return participants.length >= 2;
  }
  if (typeof session.participant_count === "number") {
    return session.participant_count >= 2;
  }
  return false;
}

/**
 * Returns the IST calendar day a session qualifies for this member, or null.
 * At most one qualifying event per session per member.
 */
export function getQualifyingEventForMember(
  session: QualifyingSessionDoc,
  userId: string,
  deletedSessionIds: ReadonlySet<string>,
): { dateKey: string } | null {
  if (deletedSessionIds.has(session.id)) return null;

  const ownerId = String(session.owner_id);
  const isOwner = ownerId === userId;
  const participants = session.session_participants ?? [];
  const me = participants.find((p) => p.user_id && String(p.user_id) === userId);
  const matched = isSessionMatched(session);

  if (isOwner) {
    if (!matched) {
      if (!session.created_at) return null;
      const createdAt = new Date(session.created_at);
      if (Number.isNaN(createdAt.getTime())) return null;
      return { dateKey: istDateKey(createdAt) };
    }
    if (!me?.call_joined_at) return null;
    const callJoinedAt = new Date(me.call_joined_at);
    if (Number.isNaN(callJoinedAt.getTime())) return null;
    return { dateKey: istDateKey(callJoinedAt) };
  }

  if (!me?.joined_at) return null;
  const joinedAt = new Date(me.joined_at);
  if (Number.isNaN(joinedAt.getTime())) return null;
  return { dateKey: istDateKey(joinedAt) };
}

export function countCompliantDays(days: QualifyingDayCount[]): number {
  return days.filter((d) => d.qualifying >= 3).length;
}

function prevDayKey(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  const d = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function earliestDateKey(keys: string[]): string | undefined {
  return keys.sort((a, b) => a.localeCompare(b))[0];
}

/**
 * Continuous inactivity streak ending today (IST): consecutive calendar days
 * since the last compliant day (qualifying >= 3). Returns 0 if today is compliant.
 * Does not count days before the member's first qualifying or first recorded activity.
 */
export function computeInactiveDays(
  days: QualifyingDayCount[],
  todayKey: string,
  earliestKey?: string,
  firstActivityKey?: string | null,
): number {
  return computeInactiveDaysFromMap(
    new Map(days.map((d) => [d.date, d.qualifying])),
    todayKey,
    earliestKey,
    firstActivityKey,
  );
}

/** Sparse qualifying map variant — avoids building 365-day arrays per member. */
export function computeInactiveDaysFromMap(
  qualifyingByDate: Map<string, number>,
  todayKey: string,
  earliestKey?: string,
  firstActivityKey?: string | null,
): number {
  if ((qualifyingByDate.get(todayKey) ?? 0) >= 3) return 0;

  const hardStop = earliestKey ?? todayKey;
  const firstQualifyingKey = earliestDateKey(
    [...qualifyingByDate.entries()]
      .filter(([, q]) => q > 0)
      .map(([date]) => date),
  );
  const floor =
    earliestDateKey(
      [firstQualifyingKey, firstActivityKey ?? undefined].filter(
        (key): key is string => Boolean(key),
      ),
    ) ?? hardStop;

  let streak = 0;
  let cursor = todayKey;

  while (cursor >= floor) {
    if ((qualifyingByDate.get(cursor) ?? 0) >= 3) break;
    streak += 1;
    if (cursor === floor) break;
    cursor = prevDayKey(cursor);
  }

  return streak;
}
