import { describe, it, expect } from "vitest";
import {
  dayHasAnyActivity,
  filterCrewDays,
  parseCrewRangeMode,
  type DayCounts,
} from "@/app/crew/crewShared";

function day(partial: Partial<DayCounts> & { date: string }): DayCounts {
  return {
    created: 0,
    deleted: 0,
    joined: 0,
    attended: 0,
    finished: 0,
    qualifying: 0,
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

describe("parseCrewRangeMode", () => {
  it("defaults to 30 days", () => {
    expect(parseCrewRangeMode(undefined)).toBe(30);
    expect(parseCrewRangeMode("7")).toBe(30);
    expect(parseCrewRangeMode("30")).toBe(30);
  });

  it("treats all and longer windows as all-time", () => {
    expect(parseCrewRangeMode("all")).toBe("all");
    expect(parseCrewRangeMode("90")).toBe("all");
    expect(parseCrewRangeMode("365")).toBe("all");
  });
});
