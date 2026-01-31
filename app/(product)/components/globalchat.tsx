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
  const [profileUser, setProfileUser] = useState<{
    user_id: string;
    user_name?: string | null;
  } | null>(null);
  const [profileFriendStatus, setProfileFriendStatus] = useState<
    "loading" | "friend" | "request_sent" | "none"
  >("none");
  const [profileFriendReqStatus, setProfileFriendReqStatus] = useState<string | null>(null);
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

  const displayName = (m: GlobalMessage) => {
    if (m.user_name?.trim()) return m.user_name.trim();
    if (m.user_id?.length > 20) return "Someone";
    return m.user_id || "Someone";
  };

  const openProfile = (m: GlobalMessage) => {
    if (m.user_id === currentUserId) return;
    setProfileUser({ user_id: m.user_id, user_name: m.user_name });
    setProfileFriendStatus("loading");
    setProfileFriendReqStatus(null);
  };

  useEffect(() => {
    if (!profileUser?.user_id) return;
    let cancelled = false;
    const check = async () => {
      try {
        const [resFriends, resOutgoing] = await Promise.all([
          fetch("/api/friends"),
          fetch("/api/friends/requests?type=outgoing&status=pending"),
        ]);
        if (cancelled) return;
        const [dataFriends, dataOutgoing] = await Promise.all([
          resFriends.json().catch(() => ({ friends: [] })),
          resOutgoing.json().catch(() => ({ requests: [] })),
        ]);
        const friends = (dataFriends.friends ?? []) as { user_id: string }[];
        const requests = (dataOutgoing.requests ?? []) as { to_user_id: string }[];
        const isFriend = friends.some((f) => f.user_id === profileUser.user_id);
        const requestSent = requests.some((r) => r.to_user_id === profileUser.user_id);
        if (cancelled) return;
        setProfileFriendStatus(isFriend ? "friend" : requestSent ? "request_sent" : "none");
      } catch {
        if (!cancelled) setProfileFriendStatus("none");
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [profileUser?.user_id]);

  const sendFriendRequestFromProfile = async () => {
    if (!profileUser?.user_id) return;
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: profileUser.user_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send request");
      setProfileFriendStatus("request_sent");
      setProfileFriendReqStatus("Request sent");
      setTimeout(() => setProfileFriendReqStatus(null), 2000);
    } catch (e) {
      setProfileFriendReqStatus((e as Error).message);
      setTimeout(() => setProfileFriendReqStatus(null), 3000);
    }
  };

  const profileDisplayName = profileUser
    ? profileUser.user_name?.trim() || (profileUser.user_id?.length > 20 ? "Someone" : profileUser.user_id || "Someone")
    : "";

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Global Chat
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {messages.length} {messages.length === 1 ? "message" : "messages"}
            </p>
          </div>
        </div>
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

      {/* User Profile Modal (from Global Chat) */}
      {profileUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Profile
              </h3>
              <button
                type="button"
                onClick={() => setProfileUser(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-green-600 text-2xl font-semibold text-white mb-3">
                {profileDisplayName.charAt(0).toUpperCase() || "?"}
              </div>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                {profileDisplayName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-full">
                {profileUser.user_id}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              {profileFriendReqStatus && (
                <p className={`text-sm text-center ${profileFriendReqStatus === "Request sent" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {profileFriendReqStatus}
                </p>
              )}
              {profileFriendStatus === "loading" && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              )}
              {profileFriendStatus === "friend" && (
                <p className="text-sm text-center text-gray-600 dark:text-gray-400 py-2">
                  You are friends
                </p>
              )}
              {profileFriendStatus === "request_sent" && !profileFriendReqStatus && (
                <p className="text-sm text-center text-gray-600 dark:text-gray-400 py-2">
                  Friend request sent
                </p>
              )}
              {profileFriendStatus === "none" && (
                <button
                  type="button"
                  onClick={sendFriendRequestFromProfile}
                  disabled={!!profileFriendReqStatus}
                  className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  Send friend request
                </button>
              )}
              <button
                type="button"
                onClick={() => setProfileUser(null)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading messages...
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-xs">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No messages yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            <div ref={topRef} className="h-1" />

            {pagination.isLoadingMore && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  Loading older messages...
                </span>
              </div>
            )}

            {!pagination.hasMore && messages.length > 0 && (
              <div className="flex items-center justify-center py-3">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  — Beginning of chat history —
                </span>
              </div>
            )}

            {messages.map((m, idx) => {
              const showDate =
                idx === 0 ||
                new Date(messages[idx - 1].created_at).toDateString() !== new Date(m.created_at).toDateString();

              const isOwnMessage = m.user_id === currentUserId;
              const isDeleting = deletingIds.has(m.id);
              const name = displayName(m);
              const initial = name.charAt(0).toUpperCase();

              return (
                <Fragment key={m.id}>
                  {showDate && (
                    <div className="flex items-center justify-center py-2">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                        {new Date(m.created_at).toLocaleDateString([], {
                          month: "long",
                          day: "numeric",
                          year:
                            new Date(m.created_at).getFullYear() !== new Date().getFullYear()
                              ? "numeric"
                              : undefined,
                        })}
                      </span>
                    </div>
                  )}
                  <div
                    className={`group flex gap-2 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                  >
                    {isOwnMessage ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-medium text-white order-2">
                        {initial}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openProfile(m)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:ring-2 hover:ring-green-500 dark:hover:ring-green-500 transition-shadow cursor-pointer"
                        title="View profile"
                      >
                        {initial}
                      </button>
                    )}
                    <div
                      className={`flex max-w-[85%] sm:max-w-[75%] flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-baseline gap-2">
                        {isOwnMessage ? (
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            You
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openProfile(m)}
                            className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:underline cursor-pointer text-left"
                            title="View profile"
                          >
                            {name}
                          </button>
                        )}
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {formatTime(m.created_at)}
                        </span>
                      </div>
                      <div
                        className={`relative mt-0.5 rounded-2xl px-3 py-2 ${
                          m.deleted
                            ? "bg-gray-100 dark:bg-gray-800"
                            : isOwnMessage
                              ? "bg-green-600 text-white dark:bg-green-500"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        } ${!m.deleted && isOwnMessage ? "rounded-br-md" : "rounded-bl-md"}`}
                      >
                        {m.deleted ? (
                          <p className="text-xs italic text-gray-500 dark:text-gray-400">
                            This message was deleted
                          </p>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {m.content}
                          </p>
                        )}
                        {!m.deleted && isOwnMessage && (
                          <button
                            onClick={() => setDeleteConfirmId(m.id)}
                            disabled={isDeleting}
                            className="absolute -left-1 -top-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Fragment>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          />
          <button
            type="button"
            onClick={send}
            disabled={!text.trim() || isSending}
            className="shrink-0 rounded-xl bg-green-600 px-4 py-3 text-white shadow-sm hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:inline">
              {isSending ? "Sending..." : "Send"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
