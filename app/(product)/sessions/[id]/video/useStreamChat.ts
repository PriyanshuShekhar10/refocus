"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Channel as StreamChannel, StreamChat } from "stream-chat";
import { playChatMessageSound } from "@/lib/chatMessageSound";

/** Owns the chat connection for the call, plays a sound on incoming messages, and tracks unread/connect state. */
export function useStreamChat({
  apiKey,
  userId,
  tokenProvider,
  channelType,
  channelId,
  chatOpen,
}: {
  apiKey: string | undefined;
  userId: string;
  tokenProvider: () => Promise<string>;
  channelType: string | undefined;
  channelId: string | undefined;
  chatOpen: boolean;
}): { client: StreamChat | null; channel: StreamChannel | null; hasUnread: boolean; connectError: boolean; retry(): void } {
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [connectError, setConnectError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const clientRef = useRef<StreamChat | null>(null);
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;

  useEffect(() => {
    if (chatOpen) setHasUnread(false);
  }, [chatOpen]);

  const retry = useCallback(() => setRetryNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiKey || !channelType || !channelId) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    setConnectError(false);

    const setup = async () => {
      const { StreamChat: StreamChatCtor } = await import("stream-chat");
      if (cancelled) return;

      const client = StreamChatCtor.getInstance(apiKey);
      clientRef.current = client;
      try {
        await client.connectUser({ id: userId }, tokenProvider);
        if (cancelled) return;

        const ch = client.channel(channelType, channelId);
        await ch.watch();
        if (cancelled) return;

        setChannel(ch);
        unsubscribe = ch.on("message.new", (event) => {
          if (event.user?.id === userId) return;
          playChatMessageSound();
          if (!chatOpenRef.current) setHasUnread(true);
        }).unsubscribe;
      } catch (err) {
        console.error("[Stream Chat] failed to connect", err);
        if (!cancelled) setConnectError(true);
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
  }, [apiKey, userId, tokenProvider, channelType, channelId, retryNonce]);

  return { client: clientRef.current, channel, hasUnread, connectError, retry };
}
