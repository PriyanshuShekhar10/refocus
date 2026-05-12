import { describe, it, expect } from "vitest";
import {
  pad,
  toISO,
  startOfDay,
  addMinutes,
  addDays,
  ymd,
  clamp,
  minutesBetween,
  formatHour,
} from "@/lib/utils";

describe("pad", () => {
  it("pads single digit numbers", () => {
    expect(pad(1)).toBe("01");
    expect(pad(0)).toBe("00");
    expect(pad(9)).toBe("09");
  });

  it("does not pad double digit numbers", () => {
    expect(pad(10)).toBe("10");
    expect(pad(99)).toBe("99");
  });
});

describe("toISO", () => {
  it("returns an ISO string", () => {
    const d = new Date("2025-06-15T12:00:00Z");
    expect(toISO(d)).toBe("2025-06-15T12:00:00.000Z");
  });
});

describe("startOfDay", () => {
  it("zeroes out time components", () => {
    const d = new Date("2025-06-15T14:30:45.123Z");
    const result = startOfDay(d);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it("does not mutate the original date", () => {
    const d = new Date("2025-06-15T14:30:00Z");
    const original = d.getTime();
    startOfDay(d);
    expect(d.getTime()).toBe(original);
  });
});

describe("addMinutes", () => {
  it("adds positive minutes", () => {
    const d = new Date("2025-01-01T00:00:00Z");
    const result = addMinutes(d, 90);
    expect(result.toISOString()).toBe("2025-01-01T01:30:00.000Z");
  });

  it("subtracts with negative minutes", () => {
    const d = new Date("2025-01-01T01:00:00Z");
    const result = addMinutes(d, -30);
    expect(result.toISOString()).toBe("2025-01-01T00:30:00.000Z");
  });
});

describe("addDays", () => {
  it("adds days correctly", () => {
    const d = new Date("2025-01-01T12:00:00Z");
    const result = addDays(d, 5);
    expect(result.getDate()).toBe(6);
  });

  it("does not mutate the original date", () => {
    const d = new Date("2025-01-01T12:00:00Z");
    const original = d.getTime();
    addDays(d, 5);
    expect(d.getTime()).toBe(original);
  });
});

describe("ymd", () => {
  it("formats date as YYYY-MM-DD", () => {
    const d = new Date(2025, 0, 5); // Jan 5
    expect(ymd(d)).toBe("2025-01-05");
  });

  it("pads month and day", () => {
    const d = new Date(2025, 2, 9); // Mar 9
    expect(ymd(d)).toBe("2025-03-09");
  });
});

describe("clamp", () => {
  it("clamps below minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps above maximum", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("returns value within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("handles min === max", () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });
});

describe("minutesBetween", () => {
  it("calculates minutes between two dates", () => {
    const a = new Date("2025-01-01T00:00:00Z");
    const b = new Date("2025-01-01T01:30:00Z");
    expect(minutesBetween(a, b)).toBe(90);
  });

  it("returns negative for reversed dates", () => {
    const a = new Date("2025-01-01T01:00:00Z");
    const b = new Date("2025-01-01T00:00:00Z");
    expect(minutesBetween(a, b)).toBe(-60);
  });
});

describe("formatHour", () => {
  it("formats midnight as 12 AM", () => {
    expect(formatHour(0)).toBe("12 AM");
  });

  it("formats noon as 12 PM", () => {
    expect(formatHour(12)).toBe("12 PM");
  });

  it("formats morning hours", () => {
    expect(formatHour(9)).toBe("9 AM");
  });

  it("formats afternoon hours", () => {
    expect(formatHour(15)).toBe("3 PM");
  });

  it("formats 11 PM", () => {
    expect(formatHour(23)).toBe("11 PM");
  });
});
