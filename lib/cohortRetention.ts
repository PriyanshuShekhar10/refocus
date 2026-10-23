/**
 * Weekly signup-cohort retention math for the admin dashboard.
 * Weeks are Monday-start, resolved in IST (where the team and most users
 * are), independent of the server's own timezone.
 */
import { ymdInTimeZone, startOfDayInTimeZone, addDaysInTimeZone } from "@/lib/zonedTime";

export const COHORT_TIME_ZONE = "Asia/Kolkata";

/** Users signed up before this are pre-launch seed/test accounts, not real cohorts. */
export const COHORT_TRACKING_START = new Date("2026-08-01T00:00:00+05:30");

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** YYYY-MM-DD of the Monday starting `date`'s IST calendar week. */
export function mondayKey(date: Date): string {
  const dayStart = startOfDayInTimeZone(date, COHORT_TIME_ZONE);
  const ymd = ymdInTimeZone(dayStart, COHORT_TIME_ZONE);
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  const diff = (dow + 6) % 7; // days since Monday
  return ymdInTimeZone(addDaysInTimeZone(dayStart, -diff, COHORT_TIME_ZONE), COHORT_TIME_ZONE);
}

/** Whole weeks between two Monday-keys (b - a), both already week-aligned. */
function weeksBetween(aKey: string, bKey: string): number {
  const a = Date.parse(`${aKey}T00:00:00.000Z`);
  const b = Date.parse(`${bKey}T00:00:00.000Z`);
  return Math.round((b - a) / WEEK_MS);
}

export type CohortUser = { id: string; createdAt: Date };

/** One session's bearing on a user: whether it had a partner, and when (if ever) they joined its call. */
export type CohortSessionTouch = { partnered: boolean; callJoinedAt: Date | null };

export type CohortRetentionWeek = {
  week: number;
  active: number;
  rate: number;
  partial: boolean;
  activeUserIds: string[];
};

export type CohortRow = {
  cohort: string;
  size: number;
  booked: number;
  joinedCall: number;
  weeks: CohortRetentionWeek[];
};

export function computeCohortRetention(
  users: CohortUser[],
  touchesByUser: Map<string, CohortSessionTouch[]>,
  now: Date,
  options?: { minCohortSize?: number },
): CohortRow[] {
  const minCohortSize = options?.minCohortSize ?? 1;
  const todayMonday = mondayKey(now);

  const byCohort = new Map<string, CohortUser[]>();
  for (const u of users) {
    const key = mondayKey(u.createdAt);
    const list = byCohort.get(key) ?? [];
    list.push(u);
    byCohort.set(key, list);
  }

  const rows: CohortRow[] = [];
  for (const [cohort, members] of byCohort) {
    if (members.length < minCohortSize) continue;

    let booked = 0;
    let joinedCall = 0;
    const activeUserIdsByWeek = new Map<number, string[]>();

    for (const u of members) {
      const touches = touchesByUser.get(u.id) ?? [];
      const callDates = touches
        .filter((t) => t.callJoinedAt)
        .map((t) => t.callJoinedAt as Date);
      if (touches.some((t) => t.partnered)) booked += 1;
      if (callDates.length > 0) joinedCall += 1;

      const weeksSeen = new Set<number>();
      for (const d of callDates) {
        const w = weeksBetween(cohort, mondayKey(d));
        if (w < 0) continue; // defensive: shouldn't happen
        weeksSeen.add(w);
      }
      for (const w of weeksSeen) {
        const list = activeUserIdsByWeek.get(w) ?? [];
        list.push(u.id);
        activeUserIdsByWeek.set(w, list);
      }
    }

    const maxWeek = weeksBetween(cohort, todayMonday);
    const weeks: CohortRetentionWeek[] = [];
    for (let w = 0; w <= maxWeek; w++) {
      const activeUserIds = activeUserIdsByWeek.get(w) ?? [];
      // The most recent week is always still in progress (it contains "now").
      const partial = w === maxWeek;
      weeks.push({
        week: w,
        active: activeUserIds.length,
        rate: members.length > 0 ? Math.round((activeUserIds.length / members.length) * 10000) / 10000 : 0,
        partial,
        activeUserIds,
      });
    }

    rows.push({ cohort, size: members.length, booked, joinedCall, weeks });
  }

  return rows.sort((a, b) => (a.cohort < b.cohort ? -1 : a.cohort > b.cohort ? 1 : 0));
}
