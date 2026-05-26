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
