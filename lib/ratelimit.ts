import { NextResponse } from "next/server";

/**
 * In-process rate limiting (sliding window per identifier).
 * Realtime delivery uses Ably; no Redis/Upstash dependency.
 */

export type RateLimitType =
  | "api" // General API calls
  | "chat" // Chat messages (more lenient)
  | "auth" // Authentication attempts (strict)
  | "search" // Search operations
  | "ai" // AI / LLM calls (strict — external API cost)
  | "report"; // User content reports

interface RateLimitConfig {
  requests: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
}

const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  api: { requests: 100, window: "1 m" },
  chat: { requests: 30, window: "1 m" },
  auth: { requests: 5, window: "1 m" },
  search: { requests: 20, window: "1 m" },
  ai: { requests: 10, window: "1 m" },
  report: { requests: 10, window: "1 h" },
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
  reset: number;
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

/**
 * Check rate limit for a given identifier.
 * Fail-open if anything unexpected happens.
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = "api",
): Promise<RateLimitResult> {
  try {
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
