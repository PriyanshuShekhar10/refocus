"use client";

import * as Ably from "ably";

let client: Ably.Realtime | null = null;
/** Capability JSON of the most recent token request, to know which channels it covers. */
let lastCapability: string | null = null;

export function getAblyClient(): Ably.Realtime {
  if (!client) {
    client = new Ably.Realtime({
      authCallback: (_params, callback) => {
        fetch("/api/ably/token")
          .then(async (res) => {
            if (!res.ok) throw new Error(`Ably token request failed (${res.status})`);
            const tokenRequest = (await res.json()) as Ably.TokenRequest;
            lastCapability = tokenRequest.capability ?? null;
            callback(null, tokenRequest);
          })
          .catch((err: Error) => callback(err.message, null));
      },
      echoMessages: false,
    });
  }
  return client;
}

function tokenAllows(channelName: string): boolean {
  const raw = lastCapability;
  if (!raw) return false;
  try {
    return Object.prototype.hasOwnProperty.call(JSON.parse(raw), channelName);
  } catch {
    return false;
  }
}

/**
 * Tokens list private channels explicitly (a user's friend chats and own
 * sessions). A new friend or session isn't in the current token yet, so
 * re-authorise to pick it up before subscribing.
 */
export async function ensureAblyAccess(channelName: string): Promise<void> {
  if (tokenAllows(channelName)) return;
  try {
    await getAblyClient().auth.authorize();
  } catch (err) {
    console.warn("[Ably] re-authorise failed:", err);
  }
}
