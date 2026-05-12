import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to test the ratelimit module in isolation, so we unmock it
vi.unmock("@/lib/ratelimit");

// Mock the Upstash dependencies
vi.mock("@upstash/ratelimit", () => {
  const mockLimit = vi.fn();
  return {
    Ratelimit: vi.fn().mockImplementation(() => ({
      limit: mockLimit,
    })),
    __mockLimit: mockLimit,
  };
});

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({})),
}));

describe("ratelimit module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("checkRateLimit without Upstash configured", () => {
    it("allows all requests when Upstash is not configured", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { checkRateLimit } = await import("@/lib/ratelimit");
      const result = await checkRateLimit("user1", "api");

      expect(result.success).toBe(true);
      expect(result.limit).toBe(Infinity);
      expect(result.remaining).toBe(Infinity);
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
