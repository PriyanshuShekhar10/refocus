import { describe, it, expect } from "vitest";
import { hasSessionStarted, wrapUpRemainingMs } from "@/lib/sessionWindow";

describe("hasSessionStarted", () => {
  it("is false before the scheduled start", () => {
    const now = new Date("2026-08-17T12:00:00.000Z");
    expect(hasSessionStarted("2026-08-17T12:00:01.000Z", now)).toBe(false);
  });

  it("is true at the scheduled start", () => {
    const now = new Date("2026-08-17T12:00:00.000Z");
    expect(hasSessionStarted("2026-08-17T12:00:00.000Z", now)).toBe(true);
  });

  it("is true after the scheduled start", () => {
    const now = new Date("2026-08-17T12:00:01.000Z");
    expect(hasSessionStarted("2026-08-17T12:00:00.000Z", now)).toBe(true);
  });
});

describe("wrapUpRemainingMs", () => {
  it("is 0 before the session ends", () => {
    const now = new Date("2026-08-17T12:49:00.000Z");
    expect(wrapUpRemainingMs("2026-08-17T12:50:00.000Z", now)).toBe(0);
  });

  it("is 5 minutes at the scheduled end", () => {
    const now = new Date("2026-08-17T12:50:00.000Z");
    expect(wrapUpRemainingMs("2026-08-17T12:50:00.000Z", now)).toBe(5 * 60 * 1000);
  });

  it("counts down during wrap-up and hits 0 after 5 minutes", () => {
    const end = "2026-08-17T12:50:00.000Z";
    expect(wrapUpRemainingMs(end, new Date("2026-08-17T12:52:00.000Z"))).toBe(
      3 * 60 * 1000,
    );
    expect(wrapUpRemainingMs(end, new Date("2026-08-17T12:55:00.000Z"))).toBe(0);
    expect(wrapUpRemainingMs(end, new Date("2026-08-17T12:56:00.000Z"))).toBe(0);
  });
});
