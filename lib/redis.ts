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

// Store clients in globalThis to persist across hot reloads
type RedisState = {
  publisher: Redis | null;
  subscriber: Redis | null;
  subscriberReady: boolean;
  messageHandlerAttached: boolean;
};

const getRedisState = (): RedisState => {
  const g = globalThis as unknown as { __REDIS_STATE__?: RedisState };
  if (!g.__REDIS_STATE__) {
    g.__REDIS_STATE__ = {
      publisher: null,
      subscriber: null,
      subscriberReady: false,
      messageHandlerAttached: false,
    };
  }
  return g.__REDIS_STATE__;
};

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

  const state = getRedisState();

  if (!state.publisher) {
    state.publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    state.publisher.on("error", (err) => {
      console.error("[Redis Publisher] Connection error:", err.message);
    });

    state.publisher.on("connect", () => {
      console.log("[Redis Publisher] Connected");
    });
  }

  return state.publisher;
};

/**
 * Get the Redis subscriber client (singleton)
 * Used for subscribing to channels
 *
 * IMPORTANT: This client is configured for Pub/Sub mode which requires:
 * - No maxRetriesPerRequest (Pub/Sub blocks indefinitely)
 * - A single message handler that routes to all channels
 */
export const getSubscriber = (): Redis => {
  if (!redisUrl) {
    throw new Error(
      "REDIS_URL environment variable is not set. " +
        "Please configure Redis for production deployments.",
    );
  }

  const state = getRedisState();

  if (!state.subscriber) {
    // CRITICAL: maxRetriesPerRequest must be null for Pub/Sub
    // Pub/Sub connections block waiting for messages and should not timeout
    state.subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Disable for Pub/Sub
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    state.subscriber.on("error", (err) => {
      console.error("[Redis Subscriber] Connection error:", err.message);
    });

    state.subscriber.on("connect", () => {
      console.log("[Redis Subscriber] Connected");
      state.subscriberReady = true;
    });

    state.subscriber.on("close", () => {
      console.log("[Redis Subscriber] Disconnected");
      state.subscriberReady = false;
    });
  }

  return state.subscriber;
};

/**
 * Check if subscriber is ready
 */
export const isSubscriberReady = (): boolean => {
  return getRedisState().subscriberReady;
};

/**
 * Check if message handler is already attached
 */
export const isMessageHandlerAttached = (): boolean => {
  return getRedisState().messageHandlerAttached;
};

/**
 * Mark message handler as attached
 */
export const setMessageHandlerAttached = (attached: boolean): void => {
  getRedisState().messageHandlerAttached = attached;
};

/**
 * Graceful shutdown for Redis connections
 */
export const closeRedisConnections = async (): Promise<void> => {
  const state = getRedisState();
  const promises: Promise<void>[] = [];

  if (state.publisher) {
    promises.push(
      state.publisher.quit().then(() => {
        state.publisher = null;
      }),
    );
  }

  if (state.subscriber) {
    promises.push(
      state.subscriber.quit().then(() => {
        state.subscriber = null;
        state.subscriberReady = false;
        state.messageHandlerAttached = false;
      }),
    );
  }

  await Promise.all(promises);
};
