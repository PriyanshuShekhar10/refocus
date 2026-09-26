import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { markPushDelivery } from "@/lib/push/dedupe";
import {
  formatPushName,
  formatPushStartTime,
  truncatePushBody,
} from "@/lib/push/names";
import { isUserInSession } from "@/lib/push/presence";
import { notifyUser, type SendPushResult } from "@/lib/push/send";
import { channelForType, type PushType } from "@/lib/push/types";
import { resolveUserTimeZone } from "@/lib/sessionReminders";

type UserRow = {
  _id: ObjectId;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  username?: string | null;
  preferences?: {
    pushSessionReminders?: boolean;
    pushFriendRequests?: boolean;
    pushChatMessages?: boolean;
    timezone?: string;
  };
};

async function loadUser(userId: string): Promise<UserRow | null> {
  if (!ObjectId.isValid(userId)) return null;
  const db = await getDb();
  return (await db.collection<UserRow>("users").findOne(
    { _id: new ObjectId(userId) },
    {
      projection: {
        firstname: 1,
        lastname: 1,
        name: 1,
        username: 1,
        preferences: 1,
      },
    },
  )) as UserRow | null;
}

function prefers(
  prefs: UserRow["preferences"] | undefined,
  key: "pushSessionReminders" | "pushFriendRequests" | "pushChatMessages",
) {
  // Missing → default true
  return prefs?.[key] !== false;
}

async function sendTyped(input: {
  userId: string;
  type: PushType;
  title: string;
  body: string;
  sessionId?: string;
  friendId?: string;
  collapseId?: string;
  dedupeKey?: string;
  respectInCallQuiet?: boolean;
}): Promise<SendPushResult> {
  if (input.dedupeKey) {
    const ok = await markPushDelivery({
      userId: input.userId,
      kind: input.type,
      dedupeKey: input.dedupeKey,
    });
    if (!ok) {
      return {
        attempted: 0,
        sent: 0,
        failed: 0,
        skipped: true,
        reason: "deduped",
      };
    }
  }

  return notifyUser({
    userId: input.userId,
    respectInCallQuiet: input.respectInCallQuiet,
    message: {
      title: input.title,
      body: input.body,
      channel: channelForType(input.type),
      collapseId: input.collapseId,
      data: {
        type: input.type,
        ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        ...(input.friendId ? { friendId: input.friendId } : {}),
      },
    },
  });
}

export async function notifySessionRequestPush(input: {
  toUserId: string;
  fromUserId: string;
  start: Date | string;
  durationMin: number;
  requestId: string;
}): Promise<SendPushResult | null> {
  try {
    const [toUser, fromUser] = await Promise.all([
      loadUser(input.toUserId),
      loadUser(input.fromUserId),
    ]);
    if (!toUser || !prefers(toUser.preferences, "pushFriendRequests")) {
      return null;
    }
    const name = formatPushName(fromUser);
    const tz = resolveUserTimeZone(toUser.preferences);
    const when = formatPushStartTime(input.start, tz);
    return await sendTyped({
      userId: input.toUserId,
      type: "session_request",
      title: `${name} wants to focus`,
      body: `${when} · ${input.durationMin} min`,
      friendId: input.fromUserId,
      dedupeKey: input.requestId,
    });
  } catch (err) {
    console.error("[push] session_request failed:", err);
    return null;
  }
}

export async function notifySessionRequestAcceptedPush(input: {
  toUserId: string;
  fromUserId: string;
  start: Date | string;
  durationMin: number;
  sessionId: string;
}): Promise<SendPushResult | null> {
  try {
    const [toUser, fromUser] = await Promise.all([
      loadUser(input.toUserId),
      loadUser(input.fromUserId),
    ]);
    if (!toUser || !prefers(toUser.preferences, "pushFriendRequests")) {
      return null;
    }
    const name = formatPushName(fromUser);
    const tz = resolveUserTimeZone(toUser.preferences);
    const when = formatPushStartTime(input.start, tz);
    return await sendTyped({
      userId: input.toUserId,
      type: "session_request_accepted",
      title: `${name} accepted`,
      body: `${when} · ${input.durationMin} min`,
      sessionId: input.sessionId,
      friendId: input.fromUserId,
      dedupeKey: input.sessionId,
    });
  } catch (err) {
    console.error("[push] session_request_accepted failed:", err);
    return null;
  }
}

export async function notifyFriendRequestPush(input: {
  toUserId: string;
  fromUserId: string;
  requestKey: string;
}): Promise<SendPushResult | null> {
  try {
    const [toUser, fromUser] = await Promise.all([
      loadUser(input.toUserId),
      loadUser(input.fromUserId),
    ]);
    if (!toUser || !prefers(toUser.preferences, "pushFriendRequests")) {
      return null;
    }
    const name = formatPushName(fromUser);
    return await sendTyped({
      userId: input.toUserId,
      type: "friend_request",
      title: "Friend request",
      body: `${name} sent a friend request`,
      friendId: input.fromUserId,
      dedupeKey: input.requestKey,
    });
  } catch (err) {
    console.error("[push] friend_request failed:", err);
    return null;
  }
}

export async function notifyChatMessagePush(input: {
  toUserId: string;
  fromUserId: string;
  content: string;
  messageId: string;
}): Promise<SendPushResult | null> {
  try {
    const [toUser, fromUser] = await Promise.all([
      loadUser(input.toUserId),
      loadUser(input.fromUserId),
    ]);
    if (!toUser || !prefers(toUser.preferences, "pushChatMessages")) {
      return null;
    }
    const name = formatPushName(fromUser);
    return await sendTyped({
      userId: input.toUserId,
      type: "chat_message",
      title: name,
      body: truncatePushBody(input.content),
      friendId: input.fromUserId,
      collapseId: `chat:${input.fromUserId}`,
      // No per-message dedupe — collapse id handles bursts. messageId kept for logs.
      respectInCallQuiet: true,
    });
  } catch (err) {
    console.error("[push] chat_message failed:", err);
    return null;
  }
}

export async function notifyPartnerJoinedPush(input: {
  toUserId: string;
  fromUserId: string;
  sessionId: string;
}): Promise<SendPushResult | null> {
  try {
    if (await isUserInSession(input.toUserId, input.sessionId)) {
      return {
        attempted: 0,
        sent: 0,
        failed: 0,
        skipped: true,
        reason: "already_in_session",
      };
    }
    const [toUser, fromUser] = await Promise.all([
      loadUser(input.toUserId),
      loadUser(input.fromUserId),
    ]);
    if (!toUser || !prefers(toUser.preferences, "pushSessionReminders")) {
      return null;
    }
    const name = formatPushName(fromUser);
    return await sendTyped({
      userId: input.toUserId,
      type: "partner_joined",
      title: `${name} is in the session`,
      body: "Tap to join the call",
      sessionId: input.sessionId,
      friendId: input.fromUserId,
      dedupeKey: input.sessionId,
      respectInCallQuiet: false,
    });
  } catch (err) {
    console.error("[push] partner_joined failed:", err);
    return null;
  }
}

export async function notifySessionReminderPush(input: {
  userId: string;
  sessionId: string;
  partnerName: string | null;
  start: Date | string;
  durationMin: number;
  timeZone?: string;
}): Promise<SendPushResult | null> {
  try {
    const user = await loadUser(input.userId);
    if (!user || !prefers(user.preferences, "pushSessionReminders")) {
      return null;
    }
    const tz = input.timeZone ?? resolveUserTimeZone(user.preferences);
    const when = formatPushStartTime(input.start, tz);
    const partner = input.partnerName?.trim() || "your partner";
    return await sendTyped({
      userId: input.userId,
      type: "session_reminder",
      title: `Focus with ${partner}`,
      body: `Your ${input.durationMin} min session starts at ${when}`,
      sessionId: input.sessionId,
      dedupeKey: input.sessionId,
      respectInCallQuiet: false,
    });
  } catch (err) {
    console.error("[push] session_reminder failed:", err);
    return null;
  }
}
