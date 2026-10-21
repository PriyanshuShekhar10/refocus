import { describe, it, expect } from "vitest";
import { weekFocusDays } from "@/app/(product)/components/Calendar/WeekStreak";

describe("weekFocusDays", () => {
  // Wednesday 21 Oct 2026, local time
  const now = new Date(2026, 9, 21, 15, 0);

  it("covers Monday to Sunday of the current week", () => {
    const days = weekFocusDays([], now);
    expect(days.map((d) => d.label)).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    expect(days.findIndex((d) => d.today)).toBe(2);
    expect(days.map((d) => d.future)).toEqual([false, false, false, true, true, true, true]);
  });

  it("marks days with at least one completed session", () => {
    const trend = [
      { date: "2026-10-19", sessions: 2, minutes: 100 },
      { date: "2026-10-20", sessions: 0, minutes: 0 },
      { date: "2026-10-21", sessions: 1, minutes: 50 },
      { date: "2026-10-12", sessions: 3, minutes: 150 },
    ];
    expect(weekFocusDays(trend, now).map((d) => d.focused)).toEqual([true, false, true, false, false, false, false]);
  });
});
