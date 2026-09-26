export const PUSH_TYPES = [
  "session_reminder",
  "partner_joined",
  "session_request",
  "session_request_accepted",
  "chat_message",
  "friend_request",
] as const;

export type PushType = (typeof PUSH_TYPES)[number];

export type PushChannel = "sessions" | "messages";

export type PushPlatform = "ios" | "android";

export type PushPayloadData = {
  type: PushType;
  sessionId?: string;
  friendId?: string;
};

export type PushMessage = {
  title: string;
  body: string;
  data: PushPayloadData;
  channel: PushChannel;
  collapseId?: string;
};

/** Types muted while the recipient’s presence says they are in a call. */
export const QUIET_DURING_CALL: ReadonlySet<PushType> = new Set([
  "chat_message",
  "friend_request",
  "session_request",
]);

export function channelForType(type: PushType): PushChannel {
  if (type === "chat_message" || type === "friend_request") {
    return "messages";
  }
  return "sessions";
}
