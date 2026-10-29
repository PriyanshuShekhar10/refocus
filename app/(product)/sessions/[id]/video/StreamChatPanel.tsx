"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Channel as StreamChannel, StreamChat } from "stream-chat";
import "stream-chat-react/dist/css/index.css";
import "./stream-chat-fix.css";

type ChatUiSdk = typeof import("stream-chat-react");

function ChatContent({
  ui,
  client,
  channel,
}: {
  ui: ChatUiSdk;
  client: StreamChat;
  channel: StreamChannel;
}) {
  const { Chat, Channel, Window, MessageList, MessageComposer } = ui;
  return (
    <Chat client={client} theme="str-chat__theme-dark">
      <Channel channel={channel}>
        <Window>
          <MessageList />
          <MessageComposer />
        </Window>
      </Channel>
    </Chat>
  );
}

function useChatUi(): ChatUiSdk | null {
  const [ui, setUi] = useState<ChatUiSdk | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("stream-chat-react").then((mod) => {
      if (!cancelled) setUi(mod);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ui;
}

/** The loading/error/ready states shared by both the desktop panel and mobile sheet's content slot. */
function ChatSlot({
  ui,
  client,
  channel,
  connectError,
  onRetry,
}: {
  ui: ChatUiSdk | null;
  client: StreamChat | null;
  channel: StreamChannel | null;
  connectError: boolean;
  onRetry: () => void;
}) {
  if (connectError) {
    return (
      <div className="flex flex-col items-start gap-2 p-3 text-sm text-white/60">
        <span>Couldn’t load chat.</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }
  if (ui && client && channel) {
    return <ChatContent ui={ui} client={client} channel={channel} />;
  }
  return <div className="p-3 text-sm text-white/60">Loading chat…</div>;
}

type ChatPanelProps = {
  client: StreamChat | null;
  channel: StreamChannel | null;
  connectError: boolean;
  onRetry: () => void;
  onClose: () => void;
};

/** Daily Prebuilt ships its own in-call chat; this is the Stream equivalent — a desktop side panel. */
export function StreamChatPanel({ client, channel, connectError, onRetry, onClose }: ChatPanelProps) {
  const ui = useChatUi();

  return (
    <div className="flex h-full w-80 flex-col border-l border-black/10 bg-slate-950">
      <div className="flex items-center justify-between border-b border-white/10 p-2">
        <span className="text-sm font-medium text-white">Chat</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide chat"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <ChatSlot ui={ui} client={client} channel={channel} connectError={connectError} onRetry={onRetry} />
      </div>
    </div>
  );
}

/**
 * Mobile equivalent of StreamChatPanel — a full-screen overlay rather than a
 * partial-height bottom sheet, so there's never a height budget tight
 * enough to cut off the message composer at the bottom.
 */
export function StreamChatSheet({ client, channel, connectError, onRetry, onClose }: ChatPanelProps) {
  const ui = useChatUi();

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-950">
      <div
        className="flex items-center justify-between border-b border-white/10 p-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <span className="text-sm font-medium text-white">Chat</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide chat"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <ChatSlot ui={ui} client={client} channel={channel} connectError={connectError} onRetry={onRetry} />
      </div>
    </div>
  );
}
