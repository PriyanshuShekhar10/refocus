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

function isCapabilityDenied(err: unknown): boolean {
  const code = (err as { code?: number } | null)?.code;
  const message = (err as { message?: string } | null)?.message ?? "";
  return code === 40160 || message.includes("denied access based on given capability");
}

/**
 * channel.subscribe() returns a promise that rejects — uncaught, by default
 * in every call site in this app — whenever the subscribe can't complete:
 * the connection is suspended/failed (a real network blip; nothing to do
 * but let it reconnect) or the current token's capability doesn't cover
 * this channel yet. The latter can happen even right after
 * ensureAblyAccess() re-authorised, if the server-side capability (built
 * from Mongo — see lib/ablyCapability.ts) was computed before some other
 * in-flight request (e.g. joining a session) had actually committed —
 * so retry once with a forced re-authorise before giving up.
 */
export function safeChannelSubscribe(
  channel: ReturnType<Ably.Realtime["channels"]["get"]>,
  eventName: string,
  listener: (message: Ably.Message) => void,
): void {
  const attempt = (allowRetry: boolean) => {
    channel.subscribe(eventName, listener).catch((err: unknown) => {
      if (allowRetry && isCapabilityDenied(err)) {
        getAblyClient()
          .auth.authorize()
          .then(() => attempt(false))
          .catch((reauthErr) => {
            console.warn(`[Ably] re-authorise after capability denial failed for "${channel.name}":`, reauthErr);
          });
        return;
      }
      console.warn(`[Ably] subscribe to "${channel.name}" failed:`, err);
    });
  };
  attempt(true);
}
