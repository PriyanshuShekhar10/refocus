import type { StreamClient } from "@stream-io/node-sdk";

export const CHAT_CHANNEL_TYPE = "messaging";

/**
 * Daily Prebuilt ships its own in-call chat; Stream Video has none, so this
 * gives the Stream call an equivalent — a messaging channel per session.
 * Called on every join so both participants end up as members.
 */
export async function ensureStreamChatChannel(
  client: StreamClient,
  sessionId: string,
  userId: string,
): Promise<{ channelType: string; channelId: string }> {
  const channelId = `session-${sessionId}`;
  const channel = client.chat.channel(CHAT_CHANNEL_TYPE, channelId);
  await channel.getOrCreate({
    data: { created_by_id: userId, members: [{ user_id: userId }] },
  });
  // Reapply unconditionally so the second participant (channel already
  // exists, created by the first) still ends up as a member.
  await channel.update({ add_members: [{ user_id: userId }] });
  return { channelType: CHAT_CHANNEL_TYPE, channelId };
}
