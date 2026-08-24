import { describe, it, expect } from "vitest";
import { buildEventsByDay } from "@/lib/calendarDayEvents";
import type { CalendarEvent } from "@/types/calendar";

const TZ = "Asia/Kolkata";

function ev(partial: Partial<CalendarEvent> & Pick<CalendarEvent, "id" | "start" | "end" | "durationMin">): CalendarEvent {
  return {
    sessionType: "focus",
    status: "booked",
    ...partial,
  };
}

describe("buildEventsByDay overnight layout", () => {
  it("extends the start day with full duration and adds a morning continuation", () => {
    // 23:30 IST → 18:00 UTC; +75m → 00:45 IST next day
    const session = ev({
      id: "overnight",
      start: "2026-08-24T18:00:00.000Z",
      end: "2026-08-24T19:15:00.000Z",
      durationMin: 75,
    });

    const day0 = new Date("2026-08-24T00:00:00+05:30");
    const day1 = new Date("2026-08-25T00:00:00+05:30");
    const map = buildEventsByDay({
      days: [day0, day1],
      events: [session],
      timeZone: TZ,
    });

    const startDay = map["2026-08-24"];
    const endDay = map["2026-08-25"];
    expect(startDay).toHaveLength(1);
    expect(startDay[0].isContinuation).toBe(false);
    expect(startDay[0].startMinutes).toBe(23 * 60 + 30);
    expect(startDay[0].layoutDurationMin).toBe(75);

    expect(endDay).toHaveLength(1);
    expect(endDay[0].isContinuation).toBe(true);
    expect(endDay[0].startMinutes).toBe(0);
    expect(endDay[0].layoutDurationMin).toBe(45);
  });
});
