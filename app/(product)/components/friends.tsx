"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import FriendChat from "./FriendChat";
import BookSessionModal from "./BookSessionModal";
import { FiUser, FiMessageCircle, FiCalendar, FiInbox } from "react-icons/fi";

type FriendRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  from_user_email?: string;
  to_user_email?: string;
};

type Friend = {
  user_id: string;
  email?: string;
  name?: string | null;
  username?: string | null;
  since?: string;
};

type SessionRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_user_email?: string;
  to_user_email?: string;
  start: string;
  durationMin: 25 | 50 | 75;
  message?: string | null;
  responseMessage?: string | null;
  status: "pending" | "accepted" | "declined";
  created_at?: string;
  responded_at?: string | null;
};

function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-3">
        <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-[200px]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function Friends() {
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessIncoming, setSessIncoming] = useState<SessionRequest[]>([]);
  const [sessOutgoing, setSessOutgoing] = useState<SessionRequest[]>([]);
  const [respondNoteById, setRespondNoteById] = useState<
    Record<string, string>
  >({});
  const [openChatFriendId, setOpenChatFriendId] = useState<string | null>(null);
  const [openChatFriendLabel, setOpenChatFriendLabel] = useState<string>("");
  const [bookSessionFriendId, setBookSessionFriendId] = useState<string | null>(null);
  const [bookSessionFriendLabel, setBookSessionFriendLabel] = useState<string>("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [requestsExpanded, setRequestsExpanded] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resIncoming, resOutgoing, resFriends, resSessIn, resSessOut] =
        await Promise.all([
          fetch("/api/friends/requests?type=incoming&status=pending"),
          fetch("/api/friends/requests?type=outgoing&status=pending"),
          fetch("/api/friends"),
          fetch("/api/session-requests?type=incoming&status=pending"),
          fetch("/api/session-requests?type=outgoing&status=pending"),
        ]);
      const [dataIncoming, dataOutgoing, dataFriends, dataSessIn, dataSessOut] =
        await Promise.all([
          resIncoming.json(),
          resOutgoing.json(),
          resFriends.json(),
          resSessIn.json(),
          resSessOut.json(),
        ]);
      if (!resIncoming.ok)
        throw new Error(dataIncoming.error || "Failed to load incoming");
      if (!resOutgoing.ok)
        throw new Error(dataOutgoing.error || "Failed to load outgoing");
      if (!resFriends.ok)
        throw new Error(dataFriends.error || "Failed to load friends");
      if (!resSessIn.ok)
        throw new Error(
          dataSessIn.error || "Failed to load incoming session requests",
        );
      if (!resSessOut.ok)
        throw new Error(
          dataSessOut.error || "Failed to load outgoing session requests",
        );
      setIncoming(dataIncoming.requests || []);
      setOutgoing(dataOutgoing.requests || []);
      setFriends(dataFriends.friends || []);
      setSessIncoming(dataSessIn.requests || []);
      setSessOutgoing(dataSessOut.requests || []);
      try {
        window.dispatchEvent(new CustomEvent("friends:session-requests-updated"));
      } catch {}
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    (async () => {
      try {
        const res = await fetch("/api/chat/unread-counts");
        const data = await res.json();
        if (res.ok) setUnreadCounts(data.counts || {});
      } catch {}
    })();
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/chat/events");
      es.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data || "{}");
          if (d?.type === "unread:update") {
            setUnreadCounts((prev) => ({
              ...prev,
              [d.payload.friendId]: d.payload.count,
            }));
          } else if (d?.type === "unread:inc") {
            setUnreadCounts((prev) => {
              const curr = prev[d.payload.friendId] || 0;
              return {
                ...prev,
                [d.payload.friendId]: curr + (d.payload.delta || 1),
              };
            });
          }
        } catch {}
      };
    } catch {}
    return () => {
      if (es) es.close();
    };
  }, []);

  const act = async (id: string, action: "accept" | "decline") => {
    try {
      const res = await fetch(`/api/friends/requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const respondSessionRequest = async (
    id: string,
    action: "accept" | "decline",
  ) => {
    try {
      const note = respondNoteById[id] || undefined;
      const res = await fetch(`/api/session-requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message: note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to respond");
      setRespondNoteById((prev) => ({ ...prev, [id]: "" }));
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const deleteSessionRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/session-requests/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete request");
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const requestBadgeCount =
    incoming.length + sessIncoming.length;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Friends
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Chat and book focus sessions with your friends
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Two columns: Friends (left), Requests (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Friends list (left) */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FiUser className="w-4 h-4 text-indigo-500" />
            Your friends
            {friends.length > 0 && (
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                {friends.length} {friends.length === 1 ? "friend" : "friends"}
              </span>
            )}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-200 dark:divide-gray-700">
          {loading && friends.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading…
            </div>
          ) : friends.length === 0 ? (
            <EmptyState
              icon={FiUser}
              title="No friends yet"
              subtitle="Friend requests you accept will appear here"
            />
          ) : (
            friends.map((f) => {
              const label = f.email || f.user_id;
              const initial = (label[0] ?? "?").toUpperCase();
              const profileHref = f.username ? `/u/${f.username}` : null;
              return (
                <div
                  key={f.user_id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      className="flex items-center gap-3 min-w-0 group"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm font-semibold group-hover:ring-2 group-hover:ring-indigo-400 transition-all">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {f.name || label}
                        </p>
                        {f.name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {label}
                          </p>
                        )}
                        {!!unreadCounts[f.user_id] && (
                          <span className="inline-flex items-center mt-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white">
                            {unreadCounts[f.user_id]} unread
                          </span>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm font-semibold">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {f.name || label}
                        </p>
                        {f.name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {label}
                          </p>
                        )}
                        {!!unreadCounts[f.user_id] && (
                          <span className="inline-flex items-center mt-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white">
                            {unreadCounts[f.user_id]} unread
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setOpenChatFriendId(f.user_id);
                        setOpenChatFriendLabel(label);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
                    >
                      <FiMessageCircle className="w-3.5 h-3.5" />
                      Chat
                    </button>
                    <button
                      onClick={() => {
                        setBookSessionFriendId(f.user_id);
                        setBookSessionFriendLabel(label);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <FiCalendar className="w-3.5 h-3.5" />
                      Book session
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

        {/* Requests (right) */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col min-h-0">
          <button
            type="button"
            onClick={() => setRequestsExpanded((e) => !e)}
            className="w-full px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between gap-2 hover:bg-gray-100/50 dark:hover:bg-gray-800/70 transition-colors text-left shrink-0"
          >
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FiInbox className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              Requests
              {requestBadgeCount > 0 && (
                <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-medium text-white">
                  {requestBadgeCount}
                </span>
              )}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {requestsExpanded ? "Hide" : "Show"}
            </span>
          </button>
        {requestsExpanded && (
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-200 dark:divide-gray-700">
            {/* Friend requests */}
            <div className="p-4">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Friend requests
              </h3>
              <div className="space-y-2">
                {incoming.length === 0 && outgoing.length === 0 ? (
                  <EmptyState
                    icon={FiUser}
                    title="No friend requests"
                    subtitle="Incoming or outgoing"
                  />
                ) : (
                  <>
                    {incoming.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-3"
                      >
                        <div className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            From:{" "}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {r.from_user_email || r.from_user_id}
                          </span>
                        </div>
                        {r.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => act(r.id, "accept")}
                              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => act(r.id, "decline")}
                              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {outgoing.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-3"
                      >
                        <div className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            To:{" "}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {r.to_user_email || r.to_user_id}
                          </span>
                          <span className="ml-2 rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase text-gray-600 dark:text-gray-300">
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
            {/* Session requests */}
            <div className="p-4">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Session requests
              </h3>
              <div className="space-y-2">
                {sessIncoming.length === 0 && sessOutgoing.length === 0 ? (
                  <EmptyState
                    icon={FiCalendar}
                    title="No session requests"
                    subtitle="Send one from a friend's chat"
                  />
                ) : (
                  <>
                    {sessIncoming.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-3 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              From:{" "}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {r.from_user_email || r.from_user_id}
                            </span>
                            <span className="ml-2 rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase text-gray-600 dark:text-gray-300">
                              {r.status}
                            </span>
                          </div>
                          {r.status === "pending" && (
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Optional message"
                                className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                value={respondNoteById[r.id] || ""}
                                onChange={(e) =>
                                  setRespondNoteById((prev) => ({
                                    ...prev,
                                    [r.id]: e.target.value,
                                  }))
                                }
                              />
                              <button
                                onClick={() =>
                                  respondSessionRequest(r.id, "accept")
                                }
                                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() =>
                                  respondSessionRequest(r.id, "decline")
                                }
                                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(r.start).toLocaleString()} · {r.durationMin}{" "}
                          min
                          {r.message && (
                            <span className="ml-2 italic">"{r.message}"</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {sessOutgoing.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              To:{" "}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {r.to_user_email || r.to_user_id}
                            </span>
                            <span className="ml-2 rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase text-gray-600 dark:text-gray-300">
                              {r.status}
                            </span>
                          </div>
                          {r.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => deleteSessionRequest(r.id)}
                              className="rounded-md border border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              Delete request
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(r.start).toLocaleString()} · {r.durationMin}{" "}
                          min
                          {r.message && (
                            <span className="ml-2 italic">"{r.message}"</span>
                          )}
                        </div>
                        {r.responseMessage && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Response: "{r.responseMessage}"
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        </section>
      </div>

      {openChatFriendId && (
        <FriendChat
          friendId={openChatFriendId}
          friendLabel={openChatFriendLabel}
          onClose={() => setOpenChatFriendId(null)}
        />
      )}
      {bookSessionFriendId && (
        <BookSessionModal
          friendId={bookSessionFriendId}
          friendLabel={bookSessionFriendLabel}
          onClose={() => {
            setBookSessionFriendId(null);
            setBookSessionFriendLabel("");
          }}
          onSuccess={() => load()}
        />
      )}
    </div>
  );
}
