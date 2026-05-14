export const CALL_JOIN_GRACE_MINUTES = 5;

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
