import { deletePushDeviceByToken, listPushTokensForUser } from "@/lib/push/devices";
import { isUserInCall } from "@/lib/push/presence";
import {
  QUIET_DURING_CALL,
  type PushMessage,
  type PushType,
} from "@/lib/push/types";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type ExpoTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string };
};

type ExpoPushResponse = {
  data?: ExpoTicket | ExpoTicket[];
};

export type SendPushResult = {
  attempted: number;
  sent: number;
  failed: number;
  skipped: boolean;
  reason?: string;
};

function asTickets(data: ExpoPushResponse["data"]): ExpoTicket[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

/**
 * Low-level Expo push. Never throws. Removes DeviceNotRegistered tokens.
 */
export async function sendExpoPushToTokens(
  tokens: string[],
  message: PushMessage,
): Promise<SendPushResult> {
  const unique = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, skipped: true, reason: "no_tokens" };
  }

  const messages = unique.map((to) => ({
    to,
    title: message.title,
    body: message.body,
    data: message.data,
    sound: "default" as const,
    channelId: message.channel,
    priority: "high" as const,
    ...(message.collapseId ? { collapseId: message.collapseId } : {}),
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error("[push] Expo HTTP error", res.status, await res.text().catch(() => ""));
      return {
        attempted: unique.length,
        sent: 0,
        failed: unique.length,
        skipped: false,
        reason: "http_error",
      };
    }

    const json = (await res.json().catch(() => ({}))) as ExpoPushResponse;
    const tickets = asTickets(json.data);
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < tickets.length; i += 1) {
      const ticket = tickets[i];
      const token = unique[i];
      if (ticket?.status === "ok") {
        sent += 1;
        continue;
      }
      failed += 1;
      const errCode = ticket?.details?.error;
      if (errCode === "DeviceNotRegistered" && token) {
        try {
          await deletePushDeviceByToken(token);
        } catch (err) {
          console.warn("[push] Failed to delete stale token", err);
        }
      }
    }

    return { attempted: unique.length, sent, failed, skipped: false };
  } catch (err) {
    console.error("[push] Expo send failed:", err);
    return {
      attempted: unique.length,
      sent: 0,
      failed: unique.length,
      skipped: false,
      reason: "network_error",
    };
  }
}

export type NotifyUserInput = {
  userId: string;
  message: PushMessage;
  /** When true, skip if recipient presence says inCall (for quiet types only). */
  respectInCallQuiet?: boolean;
};

/**
 * Resolve tokens and send. Never throws into the caller.
 */
export async function notifyUser(input: NotifyUserInput): Promise<SendPushResult> {
  try {
    const type = input.message.data.type as PushType;
    if (input.respectInCallQuiet !== false && QUIET_DURING_CALL.has(type)) {
      if (await isUserInCall(input.userId)) {
        return {
          attempted: 0,
          sent: 0,
          failed: 0,
          skipped: true,
          reason: "in_call",
        };
      }
    }

    const tokens = await listPushTokensForUser(input.userId);
    return await sendExpoPushToTokens(tokens, input.message);
  } catch (err) {
    console.error("[push] notifyUser failed:", err);
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: false,
      reason: "error",
    };
  }
}
