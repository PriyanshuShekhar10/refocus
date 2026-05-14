import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

export const isRedisConfigured = (): boolean => {
  return Boolean(redisUrl);
};

const baseOptions = {
  enableReadyCheck: true,
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error("[Redis] Max reconnection attempts reached");
      return null;
    }
    return Math.min(times * 200, 5000);
  },
  reconnectOnError: (err: Error) => {
    const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
    return targetErrors.some((e) => err.message.includes(e));
  },
};

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
      ...baseOptions,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    state.publisher.on("error", (err) => {
      console.error("[Redis Publisher] Connection error:", err.message);
    });

    state.publisher.on("connect", () => {
      console.log("[Redis Publisher] Connected");
    });

    state.publisher.on("reconnecting", () => {
      console.log("[Redis Publisher] Reconnecting...");
    });

    state.publisher.connect().catch((err) => {
      console.error(
        "[Redis Publisher] Initial connection failed:",
        err.message,
      );
    });
  }

  return state.publisher;
};

export const getSubscriber = (): Redis => {
  if (!redisUrl) {
    throw new Error(
      "REDIS_URL environment variable is not set. " +
        "Please configure Redis for production deployments.",
    );
  }

  const state = getRedisState();

  if (!state.subscriber) {
    state.subscriber = new Redis(redisUrl, {
      ...baseOptions,
      maxRetriesPerRequest: null,
      lazyConnect: true,
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

    state.subscriber.on("reconnecting", () => {
      console.log("[Redis Subscriber] Reconnecting...");
    });

    state.subscriber.connect().catch((err) => {
      console.error(
        "[Redis Subscriber] Initial connection failed:",
        err.message,
      );
    });
  }

  return state.subscriber;
};

export const isSubscriberReady = (): boolean => {
  return getRedisState().subscriberReady;
};

export const isMessageHandlerAttached = (): boolean => {
  return getRedisState().messageHandlerAttached;
};

export const setMessageHandlerAttached = (attached: boolean): void => {
  getRedisState().messageHandlerAttached = attached;
};

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
