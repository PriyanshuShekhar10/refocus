import { describe, expect, it } from "vitest";
import { reviewSoloNeedsRefresh } from "@/lib/reviewDemo";

describe("reviewSoloNeedsRefresh", () => {
  const now = new Date("2026-09-28T08:00:00.000Z");

  it("refreshes when the solo session is missing", () => {
    expect(reviewSoloNeedsRefresh(null, null, now)).toBe(true);
  });

  it("leaves a session that is joinable right now", () => {
    const start = new Date(now.getTime() - 5 * 60 * 1000);
    const end = new Date(now.getTime() + 40 * 60 * 1000);
    expect(reviewSoloNeedsRefresh(start, end, now)).toBe(false);
  });

  it("refreshes after the call window has closed", () => {
    const start = new Date(now.getTime() - 80 * 60 * 1000);
    const end = new Date(now.getTime() - 30 * 60 * 1000);
    expect(reviewSoloNeedsRefresh(start, end, now)).toBe(true);
  });
});
