import type { OccupiedPerson, OccupiedSession } from "@/types/calendar";
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
