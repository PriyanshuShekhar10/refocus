import Redis from "ioredis";

/**
 * Redis Client Configuration
 *
 * This module provides Redis clients for Pub/Sub messaging.
 * It enables horizontal scaling by allowing multiple server instances
 * to communicate through a shared Redis channel.
 *
 * Environment Variables:
 * - REDIS_URL: Redis connection string (e.g., redis://localhost:6379)
 *
 * For production, use a managed Redis service like:
 * - Upstash Redis (recommended for serverless)
 * - Redis Cloud
 * - AWS ElastiCache
 */

const redisUrl = process.env.REDIS_URL;

// Check if Redis is configured
export const isRedisConfigured = (): boolean => {
  return Boolean(redisUrl);
};

// Lazy initialization to avoid errors when Redis is not configured
let publisherClient: Redis | null = null;
let subscriberClient: Redis | null = null;

/**
 * Get the Redis publisher client (singleton)
 * Used for publishing messages to channels
 */
export const getPublisher = (): Redis => {
  if (!redisUrl) {
    throw new Error(
      "REDIS_URL environment variable is not set. " +
        "Please configure Redis for production deployments.",
    );
  }

  if (!publisherClient) {
    publisherClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    publisherClient.on("error", (err) => {
      console.error("[Redis Publisher] Connection error:", err.message);
    });

    publisherClient.on("connect", () => {
      console.log("[Redis Publisher] Connected");
    });
  }

  return publisherClient;
};

/**
 * Get the Redis subscriber client (singleton)
 * Used for subscribing to channels
 *
 * Note: Redis requires separate connections for pub and sub
 */
export const getSubscriber = (): Redis => {
  if (!redisUrl) {
    throw new Error(
      "REDIS_URL environment variable is not set. " +
        "Please configure Redis for production deployments.",
    );
  }

  if (!subscriberClient) {
    subscriberClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    subscriberClient.on("error", (err) => {
      console.error("[Redis Subscriber] Connection error:", err.message);
    });

    subscriberClient.on("connect", () => {
      console.log("[Redis Subscriber] Connected");
    });
  }

  return subscriberClient;
};

/**
 * Graceful shutdown for Redis connections
 */
export const closeRedisConnections = async (): Promise<void> => {
  const promises: Promise<void>[] = [];

  if (publisherClient) {
    promises.push(
      publisherClient.quit().then(() => {
        publisherClient = null;
      }),
    );
  }

  if (subscriberClient) {
    promises.push(
      subscriberClient.quit().then(() => {
        subscriberClient = null;
      }),
    );
  }

  await Promise.all(promises);
};
