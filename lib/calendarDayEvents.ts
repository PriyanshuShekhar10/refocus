import type { CalendarEvent } from "@/types/calendar";
import { BOOKING_DAY_OVERFLOW_MINUTES } from "@/constants/calendar";
import {
  minutesOfDayInTimeZone,
  ymdInTimeZone,
} from "@/lib/zonedTime";

/** Calendar event positioned for a specific day column (may be a midnight continuation). */
export type DayLayoutEvent = CalendarEvent & {
  startMs: number;
  endMs: number;
  /** Minutes from midnight for top positioning on this day column */
  startMinutes: number;
  /** Visual height in minutes for this fragment */
  layoutDurationMin: number;
  /** True when this is the morning leftover of a session that started previous day */
  isContinuation: boolean;
};

/**
 * Bucket events into visible day columns. Sessions that cross midnight appear
 * on the start day (full duration, extending into the overflow hour) and as a
 * short continuation from 00:00 on the end day.
 */
export function buildEventsByDay(params: {
  days: Date[];
  events: CalendarEvent[];
  timeZone: string;
  includeEvent?: (ev: CalendarEvent) => boolean;
}): Record<string, DayLayoutEvent[]> {
  const { days, events, timeZone, includeEvent } = params;
  const map: Record<string, DayLayoutEvent[]> = {};
  for (const d of days) map[ymdInTimeZone(d, timeZone)] = [];

  for (const ev of events) {
    if (includeEvent && !includeEvent(ev)) continue;

    const startMs = new Date(ev.start).getTime();
    const endMs = new Date(ev.end).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      continue;
    }

    const startDate = new Date(startMs);
    const endDate = new Date(endMs);
    const startKey = ymdInTimeZone(startDate, timeZone);
    const endKey = ymdInTimeZone(endDate, timeZone);
    const startMinutes = minutesOfDayInTimeZone(startDate, timeZone);
    const endMinutes = minutesOfDayInTimeZone(endDate, timeZone);

    if (map[startKey]) {
      map[startKey].push({
        ...ev,
        startMs,
        endMs,
        startMinutes,
        layoutDurationMin: ev.durationMin,
        isContinuation: false,
      });
    }

    // Morning fragment on the next calendar day (within overflow window).
    if (endKey !== startKey && map[endKey] && endMinutes > 0) {
      const layoutDurationMin = Math.min(
        endMinutes,
        BOOKING_DAY_OVERFLOW_MINUTES,
      );
      map[endKey].push({
        ...ev,
        startMs,
        endMs,
        startMinutes: 0,
        layoutDurationMin,
        isContinuation: true,
      });
    }
  }

  for (const k in map) {
    map[k].sort((a, b) => a.startMs - b.startMs || Number(a.isContinuation) - Number(b.isContinuation));
  }

  return map;
}
