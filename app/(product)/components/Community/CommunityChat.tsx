"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useSession } from "next-auth/react";

type GlobalMessage = {
  id: string;
  user_id: string;
  user_name?: string | null;
  content: string;
  created_at: string;
  deleted?: boolean;
};

export default function CommunityChat() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/global-chat?limit=30", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages as GlobalMessage[]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    let es: EventSource | null = null;

    try {
      es = new EventSource("/api/global-chat/events");
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || "{}");
          if (data?.type === "hello" || data?.type === "ping") return;

          if (data?.type === "message:new" && data?.payload) {
            const newMessage = data.payload as GlobalMessage;
            if (newMessage.id && newMessage.content !== undefined) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMessage.id)) return prev;
                const optimisticIndex = prev.findIndex(
                  (m) =>
                    m.id.startsWith("temp-") &&
                    m.user_id === newMessage.user_id &&
                    m.content === newMessage.content
                );
                if (optimisticIndex !== -1) {
                  const updated = [...prev];
                  updated[optimisticIndex] = newMessage;
                  return updated;
                }
                return [...prev, newMessage];
              });
            }
          }

          if (data?.type === "message:deleted" && data?.payload?.id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === data.payload.id
                  ? { ...m, deleted: true, content: "[Deleted]" }
                  : m
              )
            );
          }
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // EventSource not supported
    }

    return () => {
      if (es) es.close();
    };
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const content = text.trim();
    if (!content || isSending) return;

    const tempId = `temp-${Date.now()}`;
    const userName = (session?.user as { name?: string } | undefined)?.name ?? null;

    const optimisticMessage: GlobalMessage = {
      id: tempId,
      user_id: currentUserId!,
      user_name: userName,
      content: content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setIsSending(true);

    try {
      const res = await fetch("/api/global-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m))
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setText(content);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const displayName = (m: GlobalMessage) => {
    if (m.user_name?.trim()) return m.user_name.trim();
    return "Someone";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">Chat</h3>
        <p className="text-xs text-muted-foreground">Community chat</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((m) => {
              const isOwn = m.user_id === currentUserId;
              const name = displayName(m);
              const initial = name.charAt(0).toUpperCase();

              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
                      isOwn
                        ? "bg-green-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {initial}
                  </div>
                  <div
                    className={`max-w-[80%] ${isOwn ? "text-right" : "text-left"}`}
                  >
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {isOwn ? "You" : name}
                      </span>
                      <span className="text-[9px] text-muted-foreground/70">
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                    <div
                      className={`inline-block px-2.5 py-1.5 rounded-xl text-xs ${
                        m.deleted
                          ? "bg-muted text-muted-foreground italic"
                          : isOwn
                          ? "bg-green-600 text-white"
                          : "bg-muted"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 py-2 border-t border-border">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            disabled={isSending}
            className="flex-1 h-8 px-3 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!text.trim() || isSending}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
