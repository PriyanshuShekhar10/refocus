"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import FriendChat from "../FriendChat";
import BookSessionModal from "../BookSessionModal";
import PageHeader from "./PageHeader";
import StatStrip from "./StatStrip";
import SectionHead from "./SectionHead";
import FriendRow, { FriendData } from "./FriendRow";
import FriendRequestCard, { FriendRequestData } from "./FriendRequestCard";
import SessionRequestCard, { SessionRequestData } from "./SessionRequestCard";
import EmptyCard from "./EmptyCard";
import Reveal from "./Reveal";
import { getAblyClient } from "@/lib/ably-client";
import { userChannel } from "@/lib/realtimeChannels";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { Shell } from "@/components/design";
import { Users } from "lucide-react";

type ProfilePreviewPayload = {
  username: string;
  name: string;
  about?: string | null;
  avatarUrl?: string | null;
};

interface FriendsProps {
  onPreviewProfile?: (profile: ProfilePreviewPayload) => void;
}

type ListMode = "all" | "recent";

export default function Friends({ onPreviewProfile }: FriendsProps) {
  const { data: session } = useSession();
  const { isMobile } = useIsMobileShell();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [incoming, setIncoming] = useState<FriendRequestData[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestData[]>([]);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessIncoming, setSessIncoming] = useState<SessionRequestData[]>([]);
  const [sessOutgoing, setSessOutgoing] = useState<SessionRequestData[]>([]);
  const [respondNoteById, setRespondNoteById] = useState<
    Record<string, string>
  >({});
  const [openChatFriendId, setOpenChatFriendId] = useState<string | null>(null);
  const [openChatFriendLabel, setOpenChatFriendLabel] = useState<string>("");
  const [openChatFriendAvatarUrl, setOpenChatFriendAvatarUrl] = useState<
    string | null
  >(null);
  const [bookSessionFriendId, setBookSessionFriendId] = useState<string | null>(
    null,
  );
  const [bookSessionFriendLabel, setBookSessionFriendLabel] =
    useState<string>("");
  const [bookSessionFriendAvatarUrl, setBookSessionFriendAvatarUrl] = useState<
    string | null
  >(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [listMode, setListMode] = useState<ListMode>("all");
  const [unfriendingIds, setUnfriendingIds] = useState<Record<string, boolean>>(
    {},
  );

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
        window.dispatchEvent(
          new CustomEvent("friends:session-requests-updated"),
        );
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
  }, []);

  useEffect(() => {
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

  const respondFriendRequest = async (
    id: string,
    action: "accept" | "decline",
  ) => {
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

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = friends;
    if (q) {
      list = list.filter((f) => {
        const hay = [f.name, f.username, f.email, f.user_id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (listMode === "recent") {
      list = [...list].sort((a, b) => {
        const ta = a.since ? new Date(a.since).getTime() : 0;
        const tb = b.since ? new Date(b.since).getTime() : 0;
        return tb - ta;
      });
    }
    return list;
  }, [friends, listMode, query]);

  const unfriend = async (f: FriendData) => {
    const label = f.name || f.email || f.username || "this friend";
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Unfriend ${label}? You won't be able to chat or book sessions until they're added again. Existing booked sessions will remain.`,
      );
      if (!ok) return;
    }
    if (unfriendingIds[f.user_id]) return;
    setUnfriendingIds((prev) => ({ ...prev, [f.user_id]: true }));
    const snapshot = friends;
    setFriends((prev) => prev.filter((x) => x.user_id !== f.user_id));
    try {
      const res = await fetch(
        `/api/friends/${encodeURIComponent(f.user_id)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 404)
        throw new Error(data.error || "Failed to unfriend");
      if (openChatFriendId === f.user_id) setOpenChatFriendId(null);
      if (bookSessionFriendId === f.user_id) {
        setBookSessionFriendId(null);
        setBookSessionFriendLabel("");
      }
      setUnreadCounts((prev) => {
        if (!(f.user_id in prev)) return prev;
        const next = { ...prev };
        delete next[f.user_id];
        return next;
      });
      await load();
    } catch (e) {
      setFriends(snapshot);
      alert((e as Error).message);
    } finally {
      setUnfriendingIds((prev) => {
        const next = { ...prev };
        delete next[f.user_id];
        return next;
      });
    }
  };

  const handleOpenChat = (f: FriendData) => {
    setOpenChatFriendId(f.user_id);
    setOpenChatFriendLabel(f.email || f.user_id);
    setOpenChatFriendAvatarUrl(f.avatarUrl ?? null);
  };
  const handleBookSession = (f: FriendData) => {
    setBookSessionFriendId(f.user_id);
    setBookSessionFriendLabel(f.name || f.email || f.user_id);
    setBookSessionFriendAvatarUrl(f.avatarUrl ?? null);
  };
  const handleOpenProfile = onPreviewProfile
    ? (f: FriendData) => {
        if (!f.username) return;
        onPreviewProfile({
          username: f.username,
          name: f.name || f.email || f.user_id,
          avatarUrl: f.avatarUrl ?? null,
        });
      }
    : undefined;

  const friendsCount = friends.length;
  const pendingInCount = incoming.length + sessIncoming.length;
  const pendingOutCount = outgoing.length + sessOutgoing.length;

  return (
    <Shell>
      <div
        style={{
          padding: "8px 4px",
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        <PageHeader query={query} onQueryChange={setQuery} />

        <StatStrip
          stats={[
            { label: "Friends", value: friendsCount },
            { label: "Pending in", value: pendingInCount },
            { label: "Pending out", value: pendingOutCount },
          ]}
        />

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <SectionHead
              title="Your circle"
              count={friendsCount}
              tools={[
                {
                  label: "All",
                  active: listMode === "all",
                  onClick: () => setListMode("all"),
                },
                {
                  label: "Recent",
                  active: listMode === "recent",
                  onClick: () => setListMode("recent"),
                },
              ]}
            />

            {loading && friends.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading your circle…
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-medium text-foreground">
                  {query ? "No friends match that search" : "No friends yet"}
                </h4>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  {query
                    ? "Try a different name or handle."
                    : "Send a friend request from a profile to start your circle."}
                </p>
              </div>
            ) : (
              <div>
                {filteredFriends.map((f, i) => (
                  <Reveal key={f.user_id} index={i}>
                    <FriendRow
                      friend={f}
                      unread={unreadCounts[f.user_id] || 0}
                      onOpenChat={handleOpenChat}
                      onBookSession={handleBookSession}
                      onOpenProfile={handleOpenProfile}
                      onUnfriend={unfriend}
                      unfriending={!!unfriendingIds[f.user_id]}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Friend requests
                {incoming.length > 0 ? (
                  <span className="ml-2 rounded-full bg-[#5D1C6A]/10 px-2 py-0.5 text-[10px] font-medium normal-case text-[#5D1C6A] dark:text-[#CA5995]">
                    {incoming.length} in
                  </span>
                ) : null}
                {outgoing.length > 0 ? (
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium normal-case text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                    {outgoing.length} out
                  </span>
                ) : null}
              </h3>
              {incoming.length === 0 && outgoing.length === 0 ? (
                <EmptyCard
                  label="No friend requests"
                  sub="Incoming and outgoing will show up here."
                />
              ) : (
                <>
                  {incoming.map((r, i) => (
                    <Reveal key={r.id} index={i}>
                      <FriendRequestCard
                        request={r}
                        direction="incoming"
                        onAccept={(id) => respondFriendRequest(id, "accept")}
                        onDecline={(id) => respondFriendRequest(id, "decline")}
                      />
                    </Reveal>
                  ))}
                  {outgoing.map((r, i) => (
                    <Reveal key={r.id} index={incoming.length + i}>
                      <FriendRequestCard request={r} direction="outgoing" />
                    </Reveal>
                  ))}
                </>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Session requests
                {sessIncoming.length > 0 ? (
                  <span className="ml-2 rounded-full bg-[#5D1C6A]/10 px-2 py-0.5 text-[10px] font-medium normal-case text-[#5D1C6A] dark:text-[#CA5995]">
                    {sessIncoming.length} in
                  </span>
                ) : null}
                {sessOutgoing.length > 0 ? (
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium normal-case text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                    {sessOutgoing.length} out
                  </span>
                ) : null}
              </h3>
              {sessIncoming.length === 0 && sessOutgoing.length === 0 ? (
                <EmptyCard
                  label="No session requests"
                  sub="Send one from a friend's chat."
                />
              ) : (
                <>
                  {sessIncoming.map((r, i) => (
                    <Reveal key={r.id} index={i}>
                      <SessionRequestCard
                        request={r}
                        direction="incoming"
                        note={respondNoteById[r.id] || ""}
                        onNoteChange={(v) =>
                          setRespondNoteById((prev) => ({ ...prev, [r.id]: v }))
                        }
                        onAccept={(id) => respondSessionRequest(id, "accept")}
                        onDecline={(id) => respondSessionRequest(id, "decline")}
                      />
                    </Reveal>
                  ))}
                  {sessOutgoing.map((r, i) => (
                    <Reveal key={r.id} index={sessIncoming.length + i}>
                      <SessionRequestCard
                        request={r}
                        direction="outgoing"
                        onCancel={(id) => deleteSessionRequest(id)}
                      />
                    </Reveal>
                  ))}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {openChatFriendId && (
        isMobile ? (
          <div className="fixed inset-0 z-[55] flex flex-col bg-white pb-16 dark:bg-gray-900 lg:static lg:pb-0">
            <FriendChat
              friendId={openChatFriendId}
              friendLabel={openChatFriendLabel}
              friendAvatarUrl={openChatFriendAvatarUrl}
              friendIsAdmin={
                friends.find((f) => f.user_id === openChatFriendId)?.isAdmin
              }
              onClose={() => setOpenChatFriendId(null)}
              layout="fullscreen"
            />
          </div>
        ) : (
          <FriendChat
            friendId={openChatFriendId}
            friendLabel={openChatFriendLabel}
            friendAvatarUrl={openChatFriendAvatarUrl}
            friendIsAdmin={
              friends.find((f) => f.user_id === openChatFriendId)?.isAdmin
            }
            onClose={() => setOpenChatFriendId(null)}
          />
        )
      )}
      {bookSessionFriendId && (
        <BookSessionModal
          friendId={bookSessionFriendId}
          friendLabel={bookSessionFriendLabel}
          friendAvatarUrl={bookSessionFriendAvatarUrl}
          onClose={() => {
            setBookSessionFriendId(null);
            setBookSessionFriendLabel("");
            setBookSessionFriendAvatarUrl(null);
          }}
          onSuccess={() => load()}
        />
      )}
    </Shell>
  );
}
