/**
 * In-process SSE event bus for any remaining Server-Sent Event routes.
 * Cross-instance realtime uses Ably; this bus only notifies subscribers
 * on the same Node process.
 */

export type EventPayload = { type: string; payload?: unknown };
type Subscriber = (event: EventPayload) => void;

type BusState = {
  channels: Map<string, Set<Subscriber>>;
};

const getState = (): BusState => {
  const g = globalThis as unknown as { __SSE_BUS__?: BusState };
  if (!g.__SSE_BUS__) {
    g.__SSE_BUS__ = {
      channels: new Map(),
    };
  }
  return g.__SSE_BUS__!;
};

/**
 * Subscribe to a channel for SSE events.
 * @returns Unsubscribe function
 */
export function subscribe(channel: string, fn: Subscriber): () => void {
  const state = getState();

  if (!state.channels.has(channel)) {
    state.channels.set(channel, new Set());
  }

  const set = state.channels.get(channel)!;
  set.add(fn);

  return () => {
    set.delete(fn);
    if (set.size === 0) {
      state.channels.delete(channel);
    }
  };
}

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
 * Publish an event to local SSE subscribers on this process.
 */
export async function publish(
  channel: string,
  event: EventPayload,
): Promise<void> {
  notifyLocalSubscribers(channel, event);
}

/**
 * Synchronous publish for backwards compatibility.
 * Prefer using the async version when possible.
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

export function sessionsChannel() {
  return `sessions:updates`;
}
