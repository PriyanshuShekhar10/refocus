import type {
  CalendarEvent,
  OccupiedPerson,
  OccupiedSession,
} from "@/types/calendar";
import {
  minutesOfDayInTimeZone,
  ymdInTimeZone,
} from "@/lib/zonedTime";

export type HourOccupancy = {
  dayKey: string;
  hour: number;
  people: OccupiedPerson[];
  total: number;
};

function addHourKeys(
  start: Date,
  end: Date,
  timeZone: string,
  out: Set<string>,
): void {
  const startDay = ymdInTimeZone(start, timeZone);
  const endDay = ymdInTimeZone(end, timeZone);
  const startMin = minutesOfDayInTimeZone(start, timeZone);
  const endMin = minutesOfDayInTimeZone(end, timeZone);

  const pushRange = (dayKey: string, fromMin: number, toMinExclusive: number) => {
    if (toMinExclusive <= fromMin) return;
    const hFirst = Math.floor(fromMin / 60);
    const hLast = Math.floor((toMinExclusive - 1) / 60);
    for (let h = hFirst; h <= hLast; h++) {
      if (h >= 0 && h <= 23) out.add(`${dayKey}|${h}`);
    }
  };

  if (startDay === endDay) {
    pushRange(startDay, startMin, endMin);
    return;
  }

  // Cross-midnight (rare for 25–75m sessions): cover end of start day + start of end day.
  pushRange(startDay, startMin, 24 * 60);
  pushRange(endDay, 0, endMin);
}

/**
 * Aggregate booked occupancy into unique people per local day+hour.
 * A session contributes to every hour band it overlaps.
 */
export function aggregateHourOccupancy(
  occupied: OccupiedSession[],
  timeZone: string,
): Map<string, HourOccupancy> {
  const peopleByKey = new Map<string, Map<string, OccupiedPerson>>();

  for (const slot of occupied) {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    if (end <= start) continue;

    const keys = new Set<string>();
    addHourKeys(start, end, timeZone, keys);

    for (const key of keys) {
      let byId = peopleByKey.get(key);
      if (!byId) {
        byId = new Map();
        peopleByKey.set(key, byId);
      }
      for (const person of slot.people) {
        if (!byId.has(person.id)) byId.set(person.id, person);
      }
    }
  }

  const result = new Map<string, HourOccupancy>();
  for (const [key, byId] of peopleByKey) {
    const [dayKey, hourStr] = key.split("|");
    const people = [...byId.values()];
    result.set(key, {
      dayKey,
      hour: Number(hourStr),
      people: people.slice(0, 2),
      total: people.length,
    });
  }
  return result;
}

export function occupancyKey(dayKey: string, hour: number): string {
  return `${dayKey}|${hour}`;
}

/** Hours where the viewer already has a finished matched session card. */
export function hoursWithMyPastMatchedSessions(
  events: CalendarEvent[],
  currentUserId: string | null,
  timeZone: string,
  now = new Date(),
): Set<string> {
  const keys = new Set<string>();
  if (!currentUserId) return keys;
  const nowMs = now.getTime();

  for (const ev of events) {
    const end = new Date(ev.end);
    const start = new Date(ev.start);
    if (Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) continue;
    if (end.getTime() >= nowMs) continue;
    const booked =
      (ev.participants?.length ?? 0) >= 2 || ev.status === "booked";
    if (!booked) continue;
    const mine =
      ev.owner_id === currentUserId ||
      (ev.participants ?? []).some((p) => p.user_id === currentUserId);
    if (!mine) continue;
    addHourKeys(start, end, timeZone, keys);
  }
  return keys;
}

/** Past open slots the viewer created that never matched — hide from the grid. */
export function isPastUnmatchedSession(
  event: CalendarEvent,
  currentUserId: string | null,
  now = new Date(),
): boolean {
  if (!currentUserId || event.owner_id !== currentUserId) return false;
  if ((event.participants?.length ?? 0) >= 2 || event.status === "booked") {
    return false;
  }
  return new Date(event.end).getTime() < now.getTime();
}
