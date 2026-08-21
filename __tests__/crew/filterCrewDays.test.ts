import { describe, it, expect } from "vitest";
import {
  dayHasAnyActivity,
  filterCrewDays,
  type DayCounts,
} from "@/app/crew/crewShared";

function day(partial: Partial<DayCounts> & { date: string }): DayCounts {
  return {
    created: 0,
    deleted: 0,
    joined: 0,
    attended: 0,
    finished: 0,
    ...partial,
  };
}

describe("filterCrewDays", () => {
  const days = [
    day({ date: "2026-08-19" }),
    day({ date: "2026-08-20", created: 2 }),
    day({ date: "2026-08-21", joined: 1 }),
  ];

  it("detects any activity", () => {
    expect(dayHasAnyActivity(days[0]!)).toBe(false);
    expect(dayHasAnyActivity(days[1]!)).toBe(true);
  });

  it("keeps only active days by default mode", () => {
    expect(filterCrewDays(days, "activity", "created").map((d) => d.date)).toEqual([
      "2026-08-20",
      "2026-08-21",
    ]);
  });

  it("filters to selected metric", () => {
    expect(filterCrewDays(days, "metric", "created").map((d) => d.date)).toEqual([
      "2026-08-20",
    ]);
  });

  it("can include empty days", () => {
    expect(filterCrewDays(days, "all", "created")).toHaveLength(3);
  });
});
