import { describe, it, expect } from "vitest";
import {
  hasSessionStarted,
  pickJoinableSession,
  wrapUpRemainingMs,
} from "@/lib/sessionWindow";

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

describe("pickJoinableSession", () => {
  const earlier = {
    id: "earlier",
    start: "2026-08-17T12:00:00.000Z",
    end: "2026-08-17T12:50:00.000Z",
  };
  const later = {
    id: "later",
    start: "2026-08-17T13:00:00.000Z",
    end: "2026-08-17T13:50:00.000Z",
  };

  it("keeps the session that is still in progress when the next one is already joinable", () => {
    // 5-minute gap: next window opens 10 min before its start, while this one is still on.
    const next = { ...later, start: "2026-08-17T12:55:00.000Z", end: "2026-08-17T13:45:00.000Z" };
    const picked = pickJoinableSession(
      [earlier, next],
      new Date("2026-08-17T12:48:00.000Z"),
    );
    expect(picked?.id).toBe("earlier");
  });

  it("switches to the next session once the previous one has ended and the gap is 10 minutes", () => {
    const picked = pickJoinableSession(
      [earlier, later],
      new Date("2026-08-17T12:55:00.000Z"),
    );
    expect(picked?.id).toBe("later");
  });

  it("switches to the next session when the gap is under 10 minutes", () => {
    const next = { ...later, start: "2026-08-17T12:55:00.000Z", end: "2026-08-17T13:45:00.000Z" };
    const picked = pickJoinableSession(
      [next, earlier],
      new Date("2026-08-17T12:52:00.000Z"),
    );
    expect(picked?.id).toBe("later");
  });

  it("stays on a session that just ended when the next one is not in its join window yet", () => {
    const next = { ...later, start: "2026-08-17T13:20:00.000Z", end: "2026-08-17T14:10:00.000Z" };
    const picked = pickJoinableSession(
      [earlier, next],
      new Date("2026-08-17T12:55:00.000Z"),
    );
    expect(picked?.id).toBe("earlier");
  });

  it("returns null when nothing is in the join window", () => {
    expect(
      pickJoinableSession([earlier, later], new Date("2026-08-17T10:00:00.000Z")),
    ).toBeNull();
  });
});
