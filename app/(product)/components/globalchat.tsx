"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";

type GlobalMessage = {
  id: string;
  user_id: string;
  user_name?: string | null;
  content: string;
  created_at: string;
  deleted?: boolean;
  deleted_at?: string;
};

type PaginationState = {
  nextCursor: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
};

export default function GlobalChat() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    nextCursor: null,
    hasMore: false,
    isLoadingMore: false,
  });

  /**
   * Load initial messages (most recent)
   */
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/global-chat?limit=50", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load messages");
      setMessages(data.messages as GlobalMessage[]);
      setPagination({
        nextCursor: data.nextCursor ?? null,
        hasMore: data.hasMore ?? false,
        isLoadingMore: false,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load older messages (pagination)
   * Called when user scrolls to top
   */
  const loadMore = useCallback(async () => {
    if (
      !pagination.hasMore ||
      pagination.isLoadingMore ||
      !pagination.nextCursor
    ) {
      return;
    }

    setPagination((prev) => ({ ...prev, isLoadingMore: true }));

    // Save scroll position to maintain it after loading
    const scrollContainer = scrollContainerRef.current;
    const previousScrollHeight = scrollContainer?.scrollHeight ?? 0;

    try {
      const url = `/api/global-chat?limit=50&cursor=${encodeURIComponent(pagination.nextCursor)}&direction=older`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok)
        throw new Error(data.error || "Failed to load more messages");

      const olderMessages = data.messages as GlobalMessage[];

      // Prepend older messages to the beginning
      setMessages((prev) => {
        // Deduplicate in case of overlapping messages
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = olderMessages.filter((m) => !existingIds.has(m.id));
        return [...newMessages, ...prev];
      });

      setPagination({
        nextCursor: data.nextCursor ?? null,
        hasMore: data.hasMore ?? false,
        isLoadingMore: false,
      });

      // Restore scroll position after DOM update
      requestAnimationFrame(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight;
          scrollContainer.scrollTop = newScrollHeight - previousScrollHeight;
        }
      });
    } catch (e) {
      setError((e as Error).message);
      setPagination((prev) => ({ ...prev, isLoadingMore: false }));
    }
  }, [pagination.hasMore, pagination.isLoadingMore, pagination.nextCursor]);

  /**
   * Intersection Observer for infinite scroll
   * Triggers loadMore when topRef becomes visible
   */
  useEffect(() => {
    const topElement = topRef.current;
    if (!topElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          entry.isIntersecting &&
          pagination.hasMore &&
          !pagination.isLoadingMore
        ) {
          loadMore();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "100px", // Trigger 100px before reaching the top
        threshold: 0,
      },
    );

    observer.observe(topElement);

    return () => {
      observer.disconnect();
    };
  }, [loadMore, pagination.hasMore, pagination.isLoadingMore]);

  useEffect(() => {
    load();
    let es: EventSource | null = null;

    try {
      es = new EventSource("/api/global-chat/events");

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || "{}");

          // Ignore heartbeat events
          if (data?.type === "hello" || data?.type === "ping") return;

          // Handle new message - append directly instead of re-fetching
          if (data?.type === "message:new" && data?.payload) {
            const newMessage = data.payload as GlobalMessage;

            // Validate the payload has required fields
            if (newMessage.id && newMessage.content !== undefined) {
              setMessages((prev) => {
                // Check if this message already exists (by real ID)
                if (prev.some((m) => m.id === newMessage.id)) {
                  return prev;
                }

                // Check for optimistic message (temp ID) with same content from same user
                // This handles the case where SSE arrives after the POST response
                const optimisticIndex = prev.findIndex(
                  (m) =>
                    m.id.startsWith("temp-") &&
                    m.user_id === newMessage.user_id &&
                    m.content === newMessage.content,
                );

                if (optimisticIndex !== -1) {
                  // Replace the optimistic message with the real one
                  const updated = [...prev];
                  updated[optimisticIndex] = newMessage;
                  return updated;
                }

                // No duplicate or optimistic message found, append normally
                return [...prev, newMessage];
              });
              return;
            }
          }

          // Handle message deletion - update locally
          if (data?.type === "message:deleted" && data?.payload?.id) {
            const deletedId = data.payload.id as string;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === deletedId
                  ? {
                      ...m,
                      deleted: true,
                      content: "[This message was deleted]",
                    }
                  : m,
              ),
            );
            return;
          }

          // Fallback: reload for any unhandled event types
          load();
        } catch {
          // Parse error, ignore
        }
      };

      es.onerror = () => {
        // Connection error - will auto-reconnect
        console.warn("[GlobalChat] SSE connection error, will retry...");
      };
    } catch {
      // EventSource not supported or other error
    }

    return () => {
      if (es) es.close();
    };
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  /**
   * Send a message with optimistic UI update
   *
   * The message appears immediately in the UI while the API request
   * is in progress. If the request fails, we remove the optimistic
   * message and restore the text input.
   */
  const send = async () => {
    const content = text.trim();
    if (!content || isSending) return;

    // Generate a temporary ID for the optimistic message
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userName =
      (session?.user as { name?: string } | undefined)?.name ?? null;

    // Create optimistic message
    const optimisticMessage: GlobalMessage = {
      id: tempId,
      user_id: currentUserId!,
      user_name: userName,
      content: content,
      created_at: new Date().toISOString(),
      deleted: false,
    };

    // Immediately add to UI (optimistic update)
    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch("/api/global-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send");
      }

      // Replace the optimistic message with the real one from SSE
      // The SSE event will add the real message, so we need to remove the temp one
      // But since SSE might arrive before this, we check if the real message exists
      setMessages((prev) => {
        // Check if the real message (from SSE) already exists
        const realMessageExists = prev.some(
          (m) =>
            m.id === data.id ||
            (m.id !== tempId &&
              m.content === content &&
              m.user_id === currentUserId),
        );

        if (realMessageExists) {
          // Remove the optimistic message since real one arrived via SSE
          return prev.filter((m) => m.id !== tempId);
        }

        // Replace temp ID with real ID (SSE hasn't arrived yet)
        return prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m));
      });

      inputRef.current?.focus();
    } catch (e) {
      // Remove the optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError((e as Error).message);
      setText(content); // Restore the text so user can retry
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (deletingIds.has(messageId)) return;

    setDeletingIds((prev) => new Set(prev).add(messageId));
    setDeleteConfirmId(null);

    try {
      const res = await fetch(`/api/global-chat/${messageId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      // Note: We don't call load() here anymore.
      // The SSE event will update the message state automatically.
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Global Chat
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Delete Message?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this message? This action cannot
              be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMessage(deleteConfirmId)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Loading messages...
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No messages yet. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Infinite scroll trigger - placed at the top */}
            <div ref={topRef} className="h-1" />

            {/* Load more indicator */}
            {pagination.isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  Loading older messages...
                </span>
              </div>
            )}

            {/* Show "no more messages" indicator */}
            {!pagination.hasMore && messages.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  — Beginning of chat history —
                </span>
              </div>
            )}

            {messages
              .filter((m) => {
                const messageDate = new Date(m.created_at);
                const now = new Date();
                const diffInHours =
                  (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
                return diffInHours < 24;
              })
              .map((m, idx, filteredMessages) => {
                const showDate =
                  idx === 0 ||
                  new Date(
                    filteredMessages[idx - 1].created_at,
                  ).toDateString() !== new Date(m.created_at).toDateString();

                const isOwnMessage = m.user_id === currentUserId;
                const isDeleting = deletingIds.has(m.id);

                return (
                  <Fragment key={m.id}>
                    {showDate && (
                      <div className="flex items-center justify-center py-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                          {new Date(m.created_at).toLocaleDateString([], {
                            month: "long",
                            day: "numeric",
                            year:
                              new Date(m.created_at).getFullYear() !==
                              new Date().getFullYear()
                                ? "numeric"
                                : undefined,
                          })}
                        </span>
                      </div>
                    )}
                    <div className="group rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 px-4 py-2 transition-colors relative">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-sm font-medium text-white">
                            {(m.user_name || m.user_id).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {m.user_name || m.user_id}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {formatTime(m.created_at)}
                            </span>
                          </div>
                          {m.deleted ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 italic">
                              This message was deleted
                            </p>
                          ) : (
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                              {m.content}
                            </p>
                          )}
                        </div>
                      </div>
                      {!m.deleted && isOwnMessage && (
                        <div className="absolute inset-0 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <button
                            onClick={() => setDeleteConfirmId(m.id)}
                            disabled={isDeleting}
                            className="pointer-events-auto mr-3 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-1.5 flex items-center gap-1.5 shadow-sm transition-colors"
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </Fragment>
                );
              })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={send}
            disabled={!text.trim() || isSending}
            className="rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2.5 flex items-center justify-center gap-2 transition-colors disabled:hover:bg-gray-300 dark:disabled:hover:bg-gray-700"
          >
            <Send className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">
              {isSending ? "Sending..." : "Send"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
