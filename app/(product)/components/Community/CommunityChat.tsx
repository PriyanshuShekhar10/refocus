"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { VerifiedName } from "@/components/verified-tag";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { getAblyClient } from "@/lib/ably-client";
import { globalChatChannel } from "@/lib/realtimeChannels";
import { useEmailVerified } from "@/hooks/useEmailVerified";
import { useCurrentUserAvatar } from "@/hooks/useCurrentUserAvatar";
import CommunityModerationMenu from "./CommunityModerationMenu";
import ReportDialog from "@/app/(product)/components/ReportDialog";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";

type GlobalMessage = {
  id: string;
  user_id: string;
  user_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  emailVerified?: boolean;
  content: string;
  created_at: string;
  deleted?: boolean;
  edited_at?: string | null;
};

type CommunityChatProps = {
  isAdmin?: boolean;
  canParticipate?: boolean;
  participationMessage?: string;
  onModerateUser?: (
    userId: string,
    action: "ban" | "unban" | "mute" | "unmute",
    muteDays?: number,
  ) => Promise<void>;
};

export default function CommunityChat({
  isAdmin = false,
  canParticipate,
  participationMessage,
  onModerateUser,
}: CommunityChatProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reportMessage, setReportMessage] = useState<GlobalMessage | null>(null);
  const { canInteract, verified: myEmailVerified, message: verifyMessage } =
    useEmailVerified();
  const canSend =
    (canParticipate !== undefined ? canParticipate : canInteract);
  const inputPlaceholder =
    participationMessage ?? (canInteract ? "Message..." : verifyMessage);
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
    const client = getAblyClient();
    const channel = client.channels.get(globalChatChannel());
    const onEvent = (message: { data?: unknown }) => {
      const data = message.data as
        | { type?: string; payload?: { id?: string } & Partial<GlobalMessage> }
        | undefined;
      if (!data?.type) return;

      if (data.type === "message:new" && data.payload) {
        const newMessage = data.payload as GlobalMessage;
        if (newMessage.id && newMessage.content !== undefined) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            const optimisticIndex = prev.findIndex(
              (m) =>
                m.id.startsWith("temp-") &&
                m.user_id === newMessage.user_id &&
                m.content === newMessage.content,
            );
            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = newMessage;
              return updated;
            }
            return [...prev, newMessage];
          });
        }
        return;
      }

      if (data.type === "message:deleted" && data.payload?.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.payload?.id
              ? { ...m, deleted: true, content: "[Deleted]" }
              : m,
          ),
        );
        return;
      }

      if (data.type === "message:updated" && data.payload?.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.payload?.id
              ? {
                  ...m,
                  content: (data.payload?.content as string) ?? m.content,
                  edited_at:
                    (data.payload?.edited_at as string) ?? new Date().toISOString(),
                }
              : m,
          ),
        );
      }
    };
    channel.subscribe("event", onEvent);
    return () => {
      channel.unsubscribe("event", onEvent);
    };
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const content = text.trim();
    if (!content || isSending || !canSend) return;

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

  const isValidDate = (d: Date) => !isNaN(d.getTime());

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (!isValidDate(date)) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (!isValidDate(date)) return "";
    try {
      return date.toLocaleDateString([], {
        month: "long",
        day: "numeric",
        year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      });
    } catch {
      return date.toDateString();
    }
  };

  const sameDay = (a: string, b: string) => {
    const da = new Date(a);
    const db = new Date(b);
    if (!isValidDate(da) || !isValidDate(db)) return true;
    return da.toDateString() === db.toDateString();
  };

  const displayName = (m: GlobalMessage) => {
    if (m.user_name?.trim()) return m.user_name.trim();
    return "Someone";
  };

  const currentUserAvatar = useCurrentUserAvatar();

  const renderMessageAvatar = (
    m: GlobalMessage,
    isOwn: boolean,
    name: string,
  ) => {
    const initial = name.charAt(0).toUpperCase();
    const avatarSrc = isOwn ? currentUserAvatar : m.avatar_url;
    const avatar = (
      <Avatar className="h-6 w-6 shrink-0">
        {avatarSrc ? <AvatarImage src={avatarSrc} alt={name} /> : null}
        <AvatarFallback
          className={`text-[10px] font-medium ${
            isOwn
              ? "bg-[#5D1C6A] text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {initial}
        </AvatarFallback>
      </Avatar>
    );
    if (!isOwn && m.username) {
      return (
        <Link
          href={`/u/${m.username}`}
          className="hover:ring-2 hover:ring-[#CA5995] rounded-full transition-shadow"
        >
          {avatar}
        </Link>
      );
    }
    return avatar;
  };

  const handleAdminDeleteMessage = async (messageId: string) => {
    const res = await fetch(`/api/admin/global-chat/${messageId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to delete message");
      throw new Error(data.error || "Failed to delete message");
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              deleted: true,
              content: "[This message was removed by a moderator]",
            }
          : m,
      ),
    );
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
            {messages.map((m, idx) => {
              const isOwn = m.user_id === currentUserId;
              const name = displayName(m);
              const showDate =
                idx === 0 || !sameDay(messages[idx - 1].created_at, m.created_at);

              return (
                <Fragment key={m.id}>
                  {showDate && (
                    <div className="flex items-center justify-center py-1.5">
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {formatDateLabel(m.created_at)}
                      </span>
                    </div>
                  )}
                <div
                  className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  {renderMessageAvatar(m, isOwn, name)}
                  <div
                    className={`max-w-[80%] ${isOwn ? "text-right" : "text-left"}`}
                  >
                    <div
                      className={`flex items-baseline gap-1.5 mb-0.5 ${
                        isOwn ? "justify-end" : ""
                      }`}
                    >
                      {!isOwn && m.username ? (
                        <Link
                          href={`/u/${m.username}`}
                          className="text-[10px] font-medium text-muted-foreground hover:text-[#5D1C6A] dark:hover:text-[#CA5995] hover:underline max-w-full"
                        >
                          <VerifiedName name={name} verified={m.emailVerified} />
                        </Link>
                      ) : (
                        <VerifiedName
                          name={isOwn ? "You" : name}
                          verified={isOwn ? (m.emailVerified ?? myEmailVerified === true) : m.emailVerified}
                          className="text-[10px] font-medium text-muted-foreground"
                        />
                      )}
                      <span className="text-[9px] text-muted-foreground/70">
                        {formatTime(m.created_at)}
                      </span>
                      {isAdmin &&
                      !isOwn &&
                      !m.deleted &&
                      onModerateUser &&
                      m.user_id ? (
                        <CommunityModerationMenu
                          targetUserId={m.user_id}
                          targetLabel={name}
                          deleteLabel="Delete message"
                          onDeleteContent={() =>
                            handleAdminDeleteMessage(m.id)
                          }
                          onModerate={onModerateUser}
                        />
                      ) : null}
                      {!isOwn && !m.deleted && m.user_id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReportMessage(m)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          aria-label="Report message"
                        >
                          <Flag className="h-3 w-3" />
                        </Button>
                      ) : null}
                    </div>
                    <div
                      className={`inline-block px-2.5 py-1.5 rounded-xl text-xs ${
                        m.deleted
                          ? "bg-muted text-muted-foreground italic"
                          : isOwn
                          ? "bg-[#5D1C6A] text-white"
                          : "bg-muted"
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.edited_at && !m.deleted ? (
                      <div className="mt-0.5 text-[9px] text-muted-foreground/70">
                        (edited)
                      </div>
                    ) : null}
                  </div>
                </div>
                </Fragment>
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
            placeholder={inputPlaceholder}
            disabled={isSending || !canSend}
            className="flex-1 h-8 px-3 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!text.trim() || isSending || !canSend}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-[#5D1C6A] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#CA5995] transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {reportMessage ? (
        <ReportDialog
          open
          onClose={() => setReportMessage(null)}
          targetType="global_message"
          targetId={reportMessage.id}
          reportedUserId={reportMessage.user_id}
          reportedLabel={displayName(reportMessage)}
          contentPreview={reportMessage.content}
        />
      ) : null}
    </div>
  );
}
