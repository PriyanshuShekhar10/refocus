/** Window during which a participant may open the live call. */
export const CALL_JOIN_GRACE_MINUTES = 10;

/**
 * Minutes before a session's start when the "Join" button becomes visible
 * to participants. Matches CALL_JOIN_GRACE_MINUTES so email links and UI
 * align with API enforcement.
 */
export const CALL_JOIN_VISIBLE_MINUTES = 10;

export function isWithinCallWindow(
  startTime: Date | string,
  endTime: Date | string,
  now = new Date(),
  graceMinutes = CALL_JOIN_GRACE_MINUTES,
): boolean {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const current = now.getTime();
  const graceMs = graceMinutes * 60 * 1000;
  return current >= start - graceMs && current <= end + graceMs;
}

/**
 * Returns true if the session is "joinable now" from a UI standpoint —
 * i.e., the Join button should be visible/enabled. Mirrors the same window
 * the API enforces, so a click never lands on a 403.
 */
export function isCallJoinable(
  startTime: Date | string,
  endTime: Date | string,
  now = new Date(),
): boolean {
  return isWithinCallWindow(startTime, endTime, now, CALL_JOIN_VISIBLE_MINUTES);
}

type JoinableSessionLike = {
  start: Date | string;
  end?: Date | string | null;
};

const FALLBACK_DURATION_MS = 60 * 60 * 1000;

function sessionBounds(session: JoinableSessionLike): { start: number; end: number } {
  const start = new Date(session.start).getTime();
  const end = session.end ? new Date(session.end).getTime() : start + FALLBACK_DURATION_MS;
  return { start, end };
}

/**
 * Which session the sidebar Join button should open.
 *
 * The join window is 10 minutes before start through 10 minutes after end,
 * so back-to-back sessions with a gap of 10 minutes or less are both
 * joinable at once. Prefer the session that is on the clock right now, then
 * the next one that has not started. A session that has already ended stays
 * selectable only when nothing upcoming is in its join window yet.
 */
export function pickJoinableSession<T extends JoinableSessionLike>(
  sessions: readonly T[],
  now = new Date(),
): T | null {
  const current = now.getTime();
  const joinable = sessions.filter((session) => {
    const { start, end } = sessionBounds(session);
    if (Number.isNaN(start) || Number.isNaN(end)) return false;
    return isCallJoinable(start, end, now);
  });
  if (joinable.length === 0) return null;

  const inProgress = joinable.filter((session) => {
    const { start, end } = sessionBounds(session);
    return start <= current && current <= end;
  });
  if (inProgress.length > 0) {
    return [...inProgress].sort(
      (a, b) => sessionBounds(a).start - sessionBounds(b).start,
    )[0];
  }

  const upcoming = joinable.filter((session) => sessionBounds(session).start > current);
  if (upcoming.length > 0) {
    return [...upcoming].sort(
      (a, b) => sessionBounds(a).start - sessionBounds(b).start,
    )[0];
  }

  return [...joinable].sort((a, b) => sessionBounds(b).end - sessionBounds(a).end)[0];
}

/** Minutes after official end that partners can stay on the call to say goodbye. */
export const WRAP_UP_MINUTES = 5;

/** True once the scheduled start has been reached (in-progress or finished). */
export function hasSessionStarted(
  startTime: Date | string,
  now = new Date(),
): boolean {
  return new Date(startTime).getTime() <= now.getTime();
}

/** Remaining wrap-up time after the scheduled end. 0 before the session ends. */
export function wrapUpRemainingMs(
  endTime: Date | string,
  now = new Date(),
  wrapUpMinutes = WRAP_UP_MINUTES,
): number {
  const end = new Date(endTime).getTime();
  const current = now.getTime();
  if (current < end) return 0;
  const wrapUpEnd = end + wrapUpMinutes * 60 * 1000;
  return Math.max(0, wrapUpEnd - current);
}
