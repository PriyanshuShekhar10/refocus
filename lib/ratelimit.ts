import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * Rate Limiting Configuration
 *
 * This module provides rate limiting to protect API endpoints from abuse.
 * It uses Upstash Redis for distributed rate limiting across multiple
 * server instances.
 *
 * Environment Variables:
 * - UPSTASH_REDIS_REST_URL: Upstash Redis REST API URL
 * - UPSTASH_REDIS_REST_TOKEN: Upstash Redis REST API token
 *
 * Get these from: https://console.upstash.com/
 */

// Check if Upstash is configured
const isUpstashConfigured = (): boolean => {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
};

// Lazy initialization of Redis client
let redis: Redis | null = null;

const getRedis = (): Redis | null => {
  if (!isUpstashConfigured()) {
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  return redis;
};

/**
 * Rate limiter configurations for different use cases
 */
export type RateLimitType =
  | "api" // General API calls
  | "chat" // Chat messages (more lenient)
  | "auth" // Authentication attempts (strict)
  | "search"; // Search operations

interface RateLimitConfig {
  requests: number; // Number of requests allowed
  window: `${number} ${"s" | "m" | "h" | "d"}`; // Time window
}

const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  api: { requests: 100, window: "1 m" }, // 100 requests per minute
  chat: { requests: 30, window: "1 m" }, // 30 messages per minute
  auth: { requests: 5, window: "1 m" }, // 5 auth attempts per minute
  search: { requests: 20, window: "1 m" }, // 20 searches per minute
};

// Cache for rate limiters
const rateLimiters: Map<RateLimitType, Ratelimit> = new Map();

/**
 * Get or create a rate limiter for the specified type
 */
const getRateLimiter = (type: RateLimitType): Ratelimit | null => {
  const redisClient = getRedis();
  if (!redisClient) {
    return null;
  }

  if (!rateLimiters.has(type)) {
    const config = RATE_LIMIT_CONFIGS[type];
    const limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      analytics: true, // Enable analytics in Upstash dashboard
      prefix: `ratelimit:${type}`,
    });
    rateLimiters.set(type, limiter);
  }

  return rateLimiters.get(type)!;
};

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
export function getClientIp(req: Request | any): string {
  let ip: string | null = null;
  
  if (req?.headers) {
    if (typeof req.headers.get === "function") {
      ip = req.headers.get("x-forwarded-for");
    } else if (typeof req.headers === "object") {
      ip = req.headers["x-forwarded-for"];
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
  const limiter = getRateLimiter(type);

  // If rate limiting is not configured, allow all requests
  if (!limiter) {
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now(),
    };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
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
