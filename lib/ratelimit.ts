import { NextResponse } from "next/server";

/**
 * Native in-memory rate limiting.
 * Scope: current Node.js process only.
 */

/**
 * Rate limiter configurations for different use cases
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
  api: { requests: 100, window: "1 m" }, // 100 requests per minute
  chat: { requests: 30, window: "1 m" }, // 30 messages per minute
  auth: { requests: 5, window: "1 m" }, // 5 auth attempts per minute
  search: { requests: 20, window: "1 m" }, // 20 searches per minute
  ai: { requests: 10, window: "1 m" }, // 10 AI calls per minute (external API cost)
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

/**
 * Rate limit result type
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Timestamp when the limit resets
}

/**
 * Extract client IP from a request object
 * Supports standard Request, NextRequest, and plain objects with headers
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

  // x-forwarded-for can be a comma-separated list; grab the first one
  return ip.split(",")[0].trim();
}

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Unique identifier (usually user ID or IP)
 * @param type - Type of rate limit to apply
 * @returns Rate limit result with success status and metadata
 *
 * @example
 * const result = await checkRateLimit(userId, "chat");
 * if (!result.success) {
 *   return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 * }
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = "api",
): Promise<RateLimitResult> {
  try {
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
  } catch (error) {
    console.error("[RateLimit] Error checking rate limit:", error);
    // On error, allow the request (fail open)
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now(),
    };
  }
}

/**
 * Create a rate-limited response with appropriate headers
 *
 * @param result - Rate limit result
 * @returns NextResponse with 429 status and rate limit headers
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
 * Add rate limit headers to a successful response
 *
 * @param response - The response to add headers to
 * @param result - Rate limit result
 * @returns Response with rate limit headers
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
 * Higher-order function to wrap an API handler with rate limiting
 *
 * @param handler - The API handler function
 * @param type - Type of rate limit to apply
 * @param getIdentifier - Function to extract identifier from request
 * @returns Wrapped handler with rate limiting
 *
 * @example
 * export const POST = withRateLimit(
 *   async (req) => { ... },
 *   "chat",
 *   async (req) => await getUserIdFromSession()
 * );
 */
export function withRateLimit<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  type: RateLimitType,
  getIdentifier: (...args: T) => Promise<string | null>,
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    const identifier = await getIdentifier(...args);

    // If no identifier, allow the request (e.g., unauthenticated)
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
