type Subscriber = (event: { type: string; payload?: unknown }) => void;

type BusState = {
  channels: Map<string, Set<Subscriber>>;
};

const getState = (): BusState => {
  const g = globalThis as unknown as { __SSE_BUS__?: BusState };
  if (!g.__SSE_BUS__) {
    g.__SSE_BUS__ = { channels: new Map() };
  }
  return g.__SSE_BUS__!;
};

export function subscribe(channel: string, fn: Subscriber) {
  const state = getState();
  if (!state.channels.has(channel)) state.channels.set(channel, new Set());
  const set = state.channels.get(channel)!;
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) state.channels.delete(channel);
  };
}

export function publish(channel: string, event: { type: string; payload?: unknown }) {
  const state = getState();
  const set = state.channels.get(channel);
  if (!set) return;
  set.forEach((fn) => {
    try {
      fn(event);
    } catch {}
  });
}

export function chatChannel(userA: string, userB: string) {
  const [a, b] = [userA, userB].sort();
  return `chat:${a}:${b}`;
}

export function userChannel(userId: string) {
  return `user:${userId}:chat`;
}


