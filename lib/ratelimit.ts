import { NextResponse } from "next/server";
import { getPublisher, isRedisConfigured } from "./redis";

/**
 * Rate limiting backed by Redis (production) with an in-memory fallback
 * (dev / no REDIS_URL). The Redis implementation uses a sliding-window
 * sorted set, so limits are shared across every serverless instance.
 */

export type RateLimitType =
  | "api" // General API calls
  | "chat" // Chat messages (more lenient)
  | "auth" // Authentication attempts (strict)
  | "search" // Search operations
  | "ai"; // AI / LLM calls (strict — external API cost)

interface RateLimitConfig {
  requests: number; // Number of requests allowed
  window: `${number} ${"s" | "m" | "h" | "d"}`; // Time window
}

const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  api: { requests: 100, window: "1 m" },
  chat: { requests: 30, window: "1 m" },
  auth: { requests: 5, window: "1 m" },
  search: { requests: 20, window: "1 m" },
  ai: { requests: 10, window: "1 m" },
};

type BucketState = Map<string, number[]>;
const getBucketState = (): BucketState => {
  const g = globalThis as unknown as { __RATE_LIMIT_BUCKETS__?: BucketState };
  if (!g.__RATE_LIMIT_BUCKETS__) g.__RATE_LIMIT_BUCKETS__ = new Map<string, number[]>();
  return g.__RATE_LIMIT_BUCKETS__;
};

function parseWindowMs(window: RateLimitConfig["window"]): number {
  const [rawAmount, rawUnit] = window.split(" ") as [string, "s" | "m" | "h" | "d"];
  const amount = Number(rawAmount);
  const unitToMs: Record<"s" | "m" | "h" | "d", number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * unitToMs[rawUnit];
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Timestamp when the limit resets
}

/**
 * Extract client IP from a request object.
 * Supports standard Request, NextRequest, and plain objects with headers.
 */
export function getClientIp(
  req:
    | Request
    | {
        headers?:
          | Record<string, string | string[] | undefined>
          | { get?: (key: string) => string | null };
      },
): string {
  let ip: string | null = null;

  if (req?.headers) {
    if ("get" in req.headers && typeof req.headers.get === "function") {
      ip = req.headers.get("x-forwarded-for");
    } else if (typeof req.headers === "object") {
      const record = req.headers as Record<string, string | string[] | undefined>;
      const val = record["x-forwarded-for"];
      ip = Array.isArray(val) ? (val[0] ?? null) : (val ?? null);
    }
  }

  if (!ip) {
    ip = "127.0.0.1";
  }

  return ip.split(",")[0].trim();
}

// ---------------------------------------------------------------------------
// In-memory backend (used in dev / when REDIS_URL is missing)
// ---------------------------------------------------------------------------

function checkInMemory(
  identifier: string,
  type: RateLimitType,
): RateLimitResult {
  const now = Date.now();
  const config = RATE_LIMIT_CONFIGS[type];
  const windowMs = parseWindowMs(config.window);
  const key = `${type}:${identifier}`;

  const buckets = getBucketState();
  const existing = buckets.get(key) ?? [];
  const kept = existing.filter((ts) => now - ts < windowMs);

  if (kept.length >= config.requests) {
    const reset = kept[0] + windowMs;
    buckets.set(key, kept);
    return {
      success: false,
      limit: config.requests,
      remaining: 0,
      reset,
    };
  }

  kept.push(now);
  buckets.set(key, kept);

  const oldest = kept[0] ?? now;
  return {
    success: true,
    limit: config.requests,
    remaining: Math.max(config.requests - kept.length, 0),
    reset: oldest + windowMs,
  };
}

// ---------------------------------------------------------------------------
// Redis backend (sliding-window sorted set)
// ---------------------------------------------------------------------------

async function checkRedis(
  identifier: string,
  type: RateLimitType,
): Promise<RateLimitResult | null> {
  const config = RATE_LIMIT_CONFIGS[type];
  const windowMs = parseWindowMs(config.window);
  const now = Date.now();
  const key = `rl:${type}:${identifier}`;

  let client;
  try {
    client = getPublisher();
  } catch {
    return null; // Redis not configured / connection failed
  }

  if (client.status !== "ready") return null;

  try {
    // 1) Drop entries older than the window.
    // 2) Read current count.
    // 3) Read the oldest remaining entry (for the reset timestamp).
    const minScore = now - windowMs;
    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(key, 0, minScore);
    pipeline.zcard(key);
    pipeline.zrange(key, 0, 0, "WITHSCORES");
    const results = await pipeline.exec();

    if (!results) return null;

    const count = Number(results[1]?.[1] ?? 0);
    const oldestEntry = results[2]?.[1] as string[] | undefined;
    const oldestScore = oldestEntry && oldestEntry.length >= 2
      ? Number(oldestEntry[1])
      : now;

    if (count >= config.requests) {
      // Deny without consuming a slot.
      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset: oldestScore + windowMs,
      };
    }

    // Consume a slot. Use a unique member so concurrent requests don't collide.
    const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;
    const consume = client.pipeline();
    consume.zadd(key, now, member);
    consume.pexpire(key, windowMs);
    await consume.exec();

    return {
      success: true,
      limit: config.requests,
      remaining: Math.max(config.requests - count - 1, 0),
      reset: (count === 0 ? now : oldestScore) + windowMs,
    };
  } catch (err) {
    console.error("[RateLimit] Redis error, falling back to memory:", err);
    return null;
  }
}

/**
 * Check rate limit for a given identifier.
 *
 * Uses Redis when available (so limits work across serverless instances);
 * falls back to a per-process map otherwise. Both branches return the same
 * shape, and fail open if anything unexpected happens.
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = "api",
): Promise<RateLimitResult> {
  try {
    if (isRedisConfigured()) {
      const redisResult = await checkRedis(identifier, type);
      if (redisResult) return redisResult;
    }
    return checkInMemory(identifier, type);
  } catch (error) {
    console.error("[RateLimit] Error checking rate limit:", error);
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now(),
    };
  }
}

/**
 * Create a rate-limited response with appropriate headers.
 */
export function rateLimitedResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
      message: "Please slow down and try again later.",
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset.toString(),
        "Retry-After": Math.ceil((result.reset - Date.now()) / 1000).toString(),
      },
    },
  );
}

/**
 * Add rate limit headers to a successful response.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());
  return response;
}

/**
 * Higher-order function to wrap an API handler with rate limiting.
 */
export function withRateLimit<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  type: RateLimitType,
  getIdentifier: (...args: T) => Promise<string | null>,
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    const identifier = await getIdentifier(...args);
    if (!identifier) {
      return handler(...args);
    }

    const result = await checkRateLimit(identifier, type);

    if (!result.success) {
      return rateLimitedResponse(result);
    }

    const response = await handler(...args);
    return addRateLimitHeaders(response, result);
  };
}
