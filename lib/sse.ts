import {
  getPublisher,
  getSubscriber,
  isRedisConfigured,
  isMessageHandlerAttached,
  setMessageHandlerAttached,
} from "./redis";

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
  redisSubscribedChannels: Set<string>;
};

const getState = (): BusState => {
  const g = globalThis as unknown as { __SSE_BUS__?: BusState };
  if (!g.__SSE_BUS__) {
    g.__SSE_BUS__ = {
      channels: new Map(),
      redisSubscribedChannels: new Set(),
    };
  }
  return g.__SSE_BUS__!;
};

/**
 * Initialize the global Redis message handler (called once)
 * This single handler routes messages to all local subscribers
 */
function initializeRedisMessageHandler(): void {
  if (!isRedisConfigured() || isMessageHandlerAttached()) {
    return;
  }

  try {
    const subscriber = getSubscriber();

    // Single message handler for ALL channels
    subscriber.on("message", (channel: string, message: string) => {
      try {
        const event = JSON.parse(message) as EventPayload;
        notifyLocalSubscribers(channel, event);
      } catch (err) {
        console.error("[SSE] Failed to parse Redis message:", err);
      }
    });

    setMessageHandlerAttached(true);
    console.log("[SSE] Redis message handler initialized");
  } catch (err) {
    console.error("[SSE] Failed to initialize Redis message handler:", err);
  }
}

/**
 * Subscribe to a Redis channel (if not already subscribed)
 */
async function subscribeToRedisChannel(channel: string): Promise<void> {
  const state = getState();

  if (state.redisSubscribedChannels.has(channel)) {
    return; // Already subscribed
  }

  try {
    // Initialize the message handler if not done yet
    initializeRedisMessageHandler();

    const subscriber = getSubscriber();
    await subscriber.subscribe(channel);
    state.redisSubscribedChannels.add(channel);
    console.log(`[SSE] Subscribed to Redis channel: ${channel}`);
  } catch (err) {
    console.error(`[SSE] Failed to subscribe to Redis channel ${channel}:`, err);
  }
}

/**
 * Unsubscribe from a Redis channel when no local subscribers remain.
 * Uses a short delay to avoid unsubscribe/resubscribe thrashing when
 * the last subscriber disconnects and a new one connects moments later.
 */
const UNSUB_DELAY_MS = 5_000;
const unsubTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleRedisUnsubscribe(channel: string): void {
  if (!isRedisConfigured()) return;
  // Cancel any existing timer for this channel
  const existing = unsubTimers.get(channel);
  if (existing) clearTimeout(existing);

  unsubTimers.set(
    channel,
    setTimeout(() => {
      unsubTimers.delete(channel);
      const state = getState();
      // Only unsubscribe if still truly empty
      const set = state.channels.get(channel);
      if (set && set.size > 0) return;

      if (state.redisSubscribedChannels.has(channel)) {
        try {
          const subscriber = getSubscriber();
          subscriber.unsubscribe(channel).catch((err) => {
            console.error(`[SSE] Failed to unsubscribe from Redis channel ${channel}:`, err);
          });
          state.redisSubscribedChannels.delete(channel);
          console.log(`[SSE] Unsubscribed from Redis channel: ${channel}`);
        } catch (err) {
          console.error(`[SSE] Error unsubscribing from Redis channel ${channel}:`, err);
        }
      }
    }, UNSUB_DELAY_MS),
  );
}

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

  // Cancel any pending unsubscribe timer since we have a new subscriber
  const pendingUnsub = unsubTimers.get(channel);
  if (pendingUnsub) {
    clearTimeout(pendingUnsub);
    unsubTimers.delete(channel);
  }

  // Setup Redis subscription if configured
  if (isRedisConfigured()) {
    // Fire and forget - subscription happens asynchronously
    subscribeToRedisChannel(channel).catch((err) => {
      console.error("[SSE] Error setting up Redis subscription:", err);
    });
  }

  // Return unsubscribe function
  return () => {
    set.delete(fn);
    if (set.size === 0) {
      state.channels.delete(channel);
      // Schedule Redis unsubscribe after a short delay to avoid thrashing
      scheduleRedisUnsubscribe(channel);
    }
  };
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

/** Channel for calendar/session updates; all clients refetch when any session changes */
export function sessionsChannel() {
  return `sessions:updates`;
}
