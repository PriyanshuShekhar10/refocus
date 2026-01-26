import { getPublisher, getSubscriber, isRedisConfigured } from "./redis";

/**
 * SSE Event Bus Module
 *
 * This module provides a pub/sub mechanism for Server-Sent Events.
 * It supports two modes:
 *
 * 1. In-Memory Mode (Development):
 *    - Uses a local Map for subscriptions
 *    - Works for single-instance deployments
 *    - Enabled when REDIS_URL is not set
 *
 * 2. Redis Mode (Production):
 *    - Uses Redis Pub/Sub for cross-instance communication
 *    - Required for horizontal scaling (multiple containers/serverless)
 *    - Enabled when REDIS_URL is set
 */

export type EventPayload = { type: string; payload?: unknown };
type Subscriber = (event: EventPayload) => void;

type BusState = {
  channels: Map<string, Set<Subscriber>>;
  redisSubscriptions: Set<string>;
};

const getState = (): BusState => {
  const g = globalThis as unknown as { __SSE_BUS__?: BusState };
  if (!g.__SSE_BUS__) {
    g.__SSE_BUS__ = {
      channels: new Map(),
      redisSubscriptions: new Set(),
    };
  }
  return g.__SSE_BUS__!;
};

/**
 * Subscribe to a channel for SSE events
 *
 * @param channel - The channel name to subscribe to
 * @param fn - Callback function called when an event is published
 * @returns Unsubscribe function
 */
export function subscribe(channel: string, fn: Subscriber): () => void {
  const state = getState();

  // Initialize channel set if needed
  if (!state.channels.has(channel)) {
    state.channels.set(channel, new Set());
  }

  const set = state.channels.get(channel)!;
  set.add(fn);

  // Setup Redis subscription if configured and not already subscribed
  if (isRedisConfigured() && !state.redisSubscriptions.has(channel)) {
    state.redisSubscriptions.add(channel);
    setupRedisSubscription(channel);
  }

  // Return unsubscribe function
  return () => {
    set.delete(fn);
    if (set.size === 0) {
      state.channels.delete(channel);
      // Note: We don't unsubscribe from Redis here to avoid race conditions
      // Redis subscriptions are lightweight and can persist
    }
  };
}

/**
 * Setup Redis subscription for a channel
 * Messages received from Redis are forwarded to local subscribers
 */
async function setupRedisSubscription(channel: string): Promise<void> {
  try {
    const subscriber = getSubscriber();

    subscriber.on("message", (receivedChannel: string, message: string) => {
      if (receivedChannel !== channel) return;

      try {
        const event = JSON.parse(message) as EventPayload;
        notifyLocalSubscribers(channel, event);
      } catch (err) {
        console.error("[SSE] Failed to parse Redis message:", err);
      }
    });

    await subscriber.subscribe(channel);
  } catch (err) {
    console.error("[SSE] Failed to setup Redis subscription:", err);
    // Fall back to local-only mode silently
  }
}

/**
 * Notify all local subscribers of an event
 */
function notifyLocalSubscribers(channel: string, event: EventPayload): void {
  const state = getState();
  const set = state.channels.get(channel);

  if (!set) return;

  set.forEach((fn) => {
    try {
      fn(event);
    } catch (err) {
      console.error("[SSE] Subscriber error:", err);
    }
  });
}

/**
 * Publish an event to a channel
 *
 * In Redis mode: Publishes to Redis, which then broadcasts to all instances
 * In Memory mode: Directly notifies local subscribers
 *
 * @param channel - The channel to publish to
 * @param event - The event payload
 */
export async function publish(
  channel: string,
  event: EventPayload,
): Promise<void> {
  if (isRedisConfigured()) {
    // Redis mode: Publish to Redis for cross-instance delivery
    try {
      const publisher = getPublisher();
      await publisher.publish(channel, JSON.stringify(event));
    } catch (err) {
      console.error("[SSE] Failed to publish to Redis:", err);
      // Fall back to local notification
      notifyLocalSubscribers(channel, event);
    }
  } else {
    // In-memory mode: Direct local notification
    notifyLocalSubscribers(channel, event);
  }
}

/**
 * Synchronous publish for backwards compatibility
 * Prefer using the async version when possible
 */
export function publishSync(channel: string, event: EventPayload): void {
  publish(channel, event).catch((err) => {
    console.error("[SSE] Sync publish error:", err);
  });
}

export function chatChannel(userA: string, userB: string) {
  const [a, b] = [userA, userB].sort();
  return `chat:${a}:${b}`;
}

export function userChannel(userId: string) {
  return `user:${userId}:chat`;
}

export function globalChatChannel() {
  return `chat:global`;
}
