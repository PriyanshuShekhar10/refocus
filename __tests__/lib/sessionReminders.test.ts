import { describe, expect, it } from "vitest";
import {
  getISTDayBounds,
  isMatchedSessionParticipants,
  resolveReminderTiming,
  startWindowForTiming,
} from "@/lib/sessionReminders";
import { DEFAULT_SESSION_REMINDER_TIMING } from "@/lib/sessionReminderPrefs";

describe("sessionReminders", () => {
  it("defaults reminder timing when unset", () => {
    expect(resolveReminderTiming(undefined)).toBe(DEFAULT_SESSION_REMINDER_TIMING);
    expect(resolveReminderTiming({})).toBe(DEFAULT_SESSION_REMINDER_TIMING);
  });

  it("returns null when reminders disabled", () => {
    expect(resolveReminderTiming({ emailSessionReminders: false })).toBeNull();
  });

  it("respects explicit timing", () => {
    expect(resolveReminderTiming({ sessionReminderTiming: "10m" })).toBe("10m");
  });

  it("builds IST day bounds", () => {
    const now = new Date("2026-05-26T02:00:00.000Z");
    const { start, end, dayKey } = getISTDayBounds(now);
    expect(dayKey).toBe("2026-05-26");
    expect(start.toISOString()).toBe("2026-05-25T18:30:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("creates start windows for timed reminders", () => {
    const now = new Date("2026-05-26T10:00:00.000Z");
    const oneHour = startWindowForTiming("1h", now);
    const tenMin = startWindowForTiming("10m", now);

    expect(oneHour.from.getTime()).toBe(now.getTime() + 57 * 60 * 1000);
    expect(oneHour.to.getTime()).toBe(now.getTime() + 63 * 60 * 1000);
    expect(tenMin.from.getTime()).toBe(now.getTime() + 7 * 60 * 1000);
    expect(tenMin.to.getTime()).toBe(now.getTime() + 13 * 60 * 1000);
  });

  it("treats sessions as matched only with two participants", () => {
    expect(isMatchedSessionParticipants([])).toBe(false);
    expect(isMatchedSessionParticipants([{ user_id: "a" }])).toBe(false);
    expect(
      isMatchedSessionParticipants([{ user_id: "a" }, { user_id: "b" }]),
    ).toBe(true);
  });
});
