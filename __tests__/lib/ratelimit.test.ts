import { describe, it, expect, vi, beforeEach } from "vitest";

describe("ratelimit module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("checkRateLimit with in-memory sliding window", () => {
    it("tracks usage and blocks after limit", async () => {
      const { checkRateLimit } = await import("@/lib/ratelimit");
      const identifier = `user-${Date.now()}`;
      const type = "auth";

      const first = await checkRateLimit(identifier, type);
      const second = await checkRateLimit(identifier, type);
      const third = await checkRateLimit(identifier, type);
      const fourth = await checkRateLimit(identifier, type);
      const fifth = await checkRateLimit(identifier, type);
      const blocked = await checkRateLimit(identifier, type);

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(third.success).toBe(true);
      expect(fourth.success).toBe(true);
      expect(fifth.success).toBe(true);
      expect(blocked.success).toBe(false);
      expect(blocked.limit).toBe(5);
      expect(blocked.remaining).toBe(0);
      expect(blocked.reset).toBeGreaterThan(Date.now());
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
