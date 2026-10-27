"use client";

import { useEffect, useRef, useState } from "react";
import type { Channel as StreamChannel, StreamChat } from "stream-chat";
import { playChatMessageSound } from "@/lib/chatMessageSound";

/** Owns the chat connection for the call and plays a sound on incoming messages. */
export function useStreamChat({
  apiKey,
  userId,
  token,
  channelType,
  channelId,
}: {
  apiKey: string | undefined;
  userId: string;
  token: string;
  channelType: string | undefined;
  channelId: string | undefined;
}): { client: StreamChat | null; channel: StreamChannel | null } {
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const clientRef = useRef<StreamChat | null>(null);

  useEffect(() => {
    if (!apiKey || !channelType || !channelId) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const setup = async () => {
      const { StreamChat: StreamChatCtor } = await import("stream-chat");
      if (cancelled) return;

      const client = StreamChatCtor.getInstance(apiKey);
      clientRef.current = client;
      try {
        await client.connectUser({ id: userId }, token);
        if (cancelled) return;

        const ch = client.channel(channelType, channelId);
        await ch.watch();
        if (cancelled) return;

        setChannel(ch);
        unsubscribe = ch.on("message.new", (event) => {
          if (event.user?.id === userId) return;
          playChatMessageSound();
        }).unsubscribe;
      } catch (err) {
        console.error("[Stream Chat] failed to connect", err);
      }
    };

    void setup();

    return () => {
      cancelled = true;
      unsubscribe?.();
      setChannel(null);
      const client = clientRef.current;
      clientRef.current = null;
      if (client) void client.disconnectUser().catch(() => {});
    };
  }, [apiKey, userId, token, channelType, channelId]);

  return { client: clientRef.current, channel };
}
