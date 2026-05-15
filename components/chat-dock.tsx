"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FriendChat from "@/app/(product)/components/FriendChat";
import { FiX } from "react-icons/fi";
import { useSession } from "next-auth/react";
import { getAblyClient } from "@/lib/ably-client";
import { userChannel } from "@/lib/realtimeChannels";

type Friend = {
  user_id: string;
  email?: string;
  name?: string | null;
  presence?: "online" | "away" | "offline";
  lastMessage?: string;
};

type OpenChat = {
  friendId: string;
  friendLabel: string;
  minimized: boolean;
};

export function ChatDock() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [panelOpen, setPanelOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);

  const loadFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const res = await fetch("/api/friends", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFriends((data.friends || []) as Friend[]);
        setFriendsLoaded(true);
      }
    } catch {
      // Keep existing list on transient failures.
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  useEffect(() => {
    if (!panelOpen) return;
    loadFriends();
  }, [panelOpen, loadFriends]);

  useEffect(() => {
    const onFocus = () => {
      if (panelOpen) {
        loadFriends();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [panelOpen, loadFriends]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/chat/unread-counts");
        const data = await res.json();
        if (res.ok) setUnreadCounts(data.counts || {});
      } catch {}
    })();
    if (!currentUserId) return;
    const client = getAblyClient();
    const channel = client.channels.get(userChannel(currentUserId));
    const onEvent = (message: { data?: unknown }) => {
      try {
        const d = message.data as
          | {
              type?: string;
              payload?: { friendId?: string; count?: number; delta?: number };
            }
          | undefined;
        if (!d?.type || !d.payload?.friendId) return;
        if (d.type === "unread:update") {
          setUnreadCounts((prev) => ({
            ...prev,
            [d.payload!.friendId!]: d.payload!.count ?? 0,
          }));
        } else if (d.type === "unread:inc") {
          setUnreadCounts((prev) => {
            const curr = prev[d.payload!.friendId!] || 0;
            return {
              ...prev,
              [d.payload!.friendId!]: curr + (d.payload!.delta || 1),
            };
          });
        }
      } catch {}
    };
    channel.subscribe("event", onEvent);
    return () => {
      channel.unsubscribe("event", onEvent);
    };
  }, [currentUserId]);

  const totalUnread = useMemo(
    () => Object.values(unreadCounts).reduce((a, b) => a + (b || 0), 0),
    [unreadCounts],
  );

  // Broadcast unread changes to sidebar for badge updates
  useEffect(() => {
    try {
      const ev = new CustomEvent("chatdock:unread", {
        detail: { count: totalUnread },
      });
      window.dispatchEvent(ev);
    } catch {}
  }, [totalUnread]);

  // External toggles from sidebar
  useEffect(() => {
    const toggle = () => setPanelOpen((v) => !v);
    const openHandler = (e: Event) => {
      const ce = e as CustomEvent<{ friendId: string; friendLabel?: string }>;
      if (ce.detail?.friendId) {
        openOrFocusChat(
          ce.detail.friendId,
          ce.detail.friendLabel || ce.detail.friendId,
        );
      } else {
        setPanelOpen(true);
      }
    };
    window.addEventListener("chatdock:toggle", toggle as EventListener);
    window.addEventListener("chatdock:open", openHandler as EventListener);
    return () => {
      window.removeEventListener("chatdock:toggle", toggle as EventListener);
      window.removeEventListener("chatdock:open", openHandler as EventListener);
    };
  }, []);

  const openOrFocusChat = (friendId: string, friendLabel: string) => {
    setOpenChats((prev) => {
      const idx = prev.findIndex((c) => c.friendId === friendId);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], minimized: false };
        return next;
      }
      const next = [...prev, { friendId, friendLabel, minimized: false }];
      if (next.length > 3) return next.slice(-3);
      return next;
    });
    setPanelOpen(false);
  };

  const closeChat = (friendId: string) => {
    setOpenChats((prev) => prev.filter((c) => c.friendId !== friendId));
  };

  const toggleMinimize = (friendId: string) => {
    setOpenChats((prev) =>
      prev.map((c) =>
        c.friendId === friendId ? { ...c, minimized: !c.minimized } : c,
      ),
    );
  };

  const overflowCount = Math.max(0, openChats.length - 3);
  const visibleChats = openChats.slice(-3);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40">
      {/* Friends panel shows when toggled from sidebar */}
      {panelOpen ? (
        <div
          className="pointer-events-auto mb-2 w-[300px] max-h-[420px] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl"
          style={{ transformOrigin: "bottom right" }}
        >
          <div className="flex items-center justify-between px-3 h-10 border-b border-gray-200 dark:border-gray-800">
            <div className="text-sm font-semibold">Friends</div>
            <button
              onClick={() => setPanelOpen(false)}
              aria-label="Close friends list"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <FiX size={14} />
            </button>
          </div>
          <div className="max-h-[372px] overflow-y-auto">
            {!friendsLoaded || friendsLoading ? (
              <div className="p-3 text-sm text-gray-500">Loading friends…</div>
            ) : friends.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">No friends found</div>
            ) : (
              friends.map((f) => (
                <button
                  key={f.user_id}
                  onClick={() =>
                    openOrFocusChat(f.user_id, f.email || f.user_id)
                  }
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 hover:bg-accent text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      {(f.name || f.email || f.user_id)?.[0]?.toUpperCase?.() ||
                        "F"}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {f.name || f.email || f.user_id}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[160px]">
                        {f.lastMessage || ""}
                      </div>
                    </div>
                  </div>
                  {!!unreadCounts[f.user_id] && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {unreadCounts[f.user_id]}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto flex flex-row-reverse gap-2">
        {visibleChats.map((c) => (
          <div key={c.friendId}>
            <div
              className={`flex w-[320px] ${c.minimized ? "h-10" : "h-[380px]"}`}
            >
              <FriendChat
                friendId={c.friendId}
                friendLabel={c.friendLabel}
                onClose={() => closeChat(c.friendId)}
                onMinimizeToggle={() => toggleMinimize(c.friendId)}
                minimized={c.minimized}
                layout="docked"
              />
            </div>
          </div>
        ))}
        {overflowCount > 0 ? (
          <div className="self-end mb-1 rounded-full bg-gray-800 text-white text-xs px-2 py-1 shadow">
            +{overflowCount}
          </div>
        ) : null}
      </div>
    </div>
  );
}
