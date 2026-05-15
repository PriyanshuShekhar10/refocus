"use client";

import * as Ably from "ably";

let client: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
  if (!client) {
    client = new Ably.Realtime({
      authUrl: "/api/ably/token",
      echoMessages: false,
      recover: "ably-js-refocus",
    });
  }
  return client;
}
