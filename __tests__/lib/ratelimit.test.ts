import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to test the ratelimit module in isolation, so we unmock it
vi.unmock("@/lib/ratelimit");

describe("ratelimit module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("checkRateLimit", () => {
    it("enforces in-memory limits by identifier + type", async () => {
      const { checkRateLimit } = await import("@/lib/ratelimit");
      const id = `user-${Date.now()}-${Math.random()}`;

      // Auth limit is 5 per minute
      const firstFive = await Promise.all(
        Array.from({ length: 5 }, () => checkRateLimit(id, "auth")),
      );
      expect(firstFive.every((r) => r.success)).toBe(true);
      expect(firstFive[4].remaining).toBe(0);

      const blocked = await checkRateLimit(id, "auth");
      expect(blocked.success).toBe(false);
      expect(blocked.limit).toBe(5);
      expect(blocked.remaining).toBe(0);
      expect(blocked.reset).toBeGreaterThan(Date.now());

      // Different type should have an independent bucket
      const apiResult = await checkRateLimit(id, "api");
      expect(apiResult.success).toBe(true);
      expect(apiResult.limit).toBe(100);
    });
  });

  describe("rateLimitedResponse", () => {
    it("returns a 429 response with correct headers", async () => {
      const { rateLimitedResponse } = await import("@/lib/ratelimit");
      const now = Date.now();
      const result = {
        success: false,
        limit: 5,
        remaining: 0,
        reset: now + 30000,
      };

      const response = rateLimitedResponse(result);

      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.error).toBe("Too many requests");
      expect(body.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("addRateLimitHeaders", () => {
    it("adds rate limit headers to a response", async () => {
      const { addRateLimitHeaders } = await import("@/lib/ratelimit");
      const { NextResponse } = await import("next/server");

      const response = NextResponse.json({ ok: true });
      const result = {
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      };

      const modified = addRateLimitHeaders(response, result);

      expect(modified.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(modified.headers.get("X-RateLimit-Remaining")).toBe("99");
      expect(modified.headers.get("X-RateLimit-Reset")).toBeDefined();
    });
  });
});
