/**
 * Minimal IANA timezone helpers for calendar placement and wall-clock → UTC.
 * Display formatting lives in `@/lib/localTime`.
 */

import { pad } from "@/lib/utils";

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone === "auto") return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function listTimeZones(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    if (supported?.length) return supported;
  } catch {
    // fall through
  }
  return [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Africa/Cairo",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === "24" ? "0" : map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Offset of `timeZone` at `date`: zonedWallAsUtc - instant. */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  return asUtc - date.getTime();
}

/** Convert a wall-clock time in `timeZone` to a UTC `Date`. */
export function wallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset1 = getTimeZoneOffsetMs(utcGuess, timeZone);
  const adjusted = new Date(utcGuess.getTime() - offset1);
  const offset2 = getTimeZoneOffsetMs(adjusted, timeZone);
  if (offset1 !== offset2) {
    return new Date(utcGuess.getTime() - offset2);
  }
  return adjusted;
}

export function ymdInTimeZone(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function minutesOfDayInTimeZone(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const p = getZonedParts(date, timeZone);
  return wallTimeToUtc(p.year, p.month, p.day, 0, 0, timeZone);
}

export function addDaysInTimeZone(
  date: Date,
  days: number,
  timeZone: string,
): Date {
  const p = getZonedParts(date, timeZone);
  // Anchor at noon to reduce DST edge issues when stepping days.
  const noon = wallTimeToUtc(p.year, p.month, p.day, 12, 0, timeZone);
  const shifted = new Date(noon.getTime() + days * 86_400_000);
  return startOfDayInTimeZone(shifted, timeZone);
}

export function wallMinutesOnDayToUtc(
  dayDate: Date,
  minutesOfDay: number,
  timeZone: string,
): Date {
  const p = getZonedParts(dayDate, timeZone);
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  return wallTimeToUtc(p.year, p.month, p.day, hour, minute, timeZone);
}
