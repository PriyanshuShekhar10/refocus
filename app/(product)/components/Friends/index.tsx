"use client";
import { useEffect, useMemo, useState } from "react";
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
import styles from "./friends.module.css";

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
  const [bookSessionFriendId, setBookSessionFriendId] = useState<string | null>(
    null,
  );
  const [bookSessionFriendLabel, setBookSessionFriendLabel] =
    useState<string>("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [listMode, setListMode] = useState<ListMode>("all");

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

  const handleOpenChat = (f: FriendData) => {
    setOpenChatFriendId(f.user_id);
    setOpenChatFriendLabel(f.email || f.user_id);
  };
  const handleBookSession = (f: FriendData) => {
    setBookSessionFriendId(f.user_id);
    setBookSessionFriendLabel(f.email || f.user_id);
  };
  const handleOpenProfile = onPreviewProfile
    ? (f: FriendData) => {
        if (!f.username) return;
        onPreviewProfile({
          username: f.username,
          name: f.name || f.email || f.user_id,
        });
      }
    : undefined;

  const friendsCount = friends.length;
  const pendingInCount = incoming.length + sessIncoming.length;
  const pendingOutCount = outgoing.length + sessOutgoing.length;

  return (
    <div className={styles.root}>
      <main className={styles.main}>
        <PageHeader query={query} onQueryChange={setQuery} />

        <StatStrip
          stats={[
            { label: "Friends", value: friendsCount },
            { label: "Pending in", value: pendingInCount },
            { label: "Pending out", value: pendingOutCount },
          ]}
        />

        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        <div className={styles.layout}>
          {/* LEFT: Friends list */}
          <section>
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
              <div className={styles.empty}>
                <h4>Loading your circle…</h4>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIco}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="5.5" cy="5" r="2" />
                    <circle cx="11" cy="6" r="1.6" />
                    <path d="M2 13c.4-2 1.8-3 3.5-3s3.1 1 3.5 3" />
                    <path d="M10 12c.3-1.4 1.2-2 2.2-2s1.8.6 2.1 2" />
                  </svg>
                </div>
                <h4>
                  {query
                    ? "No friends match that search"
                    : "No friends yet"}
                </h4>
                <p>
                  {query
                    ? "Try a different name or handle."
                    : "Send a friend request from a profile to start your circle."}
                </p>
              </div>
            ) : (
              <div className={styles.friendsList}>
                {filteredFriends.map((f, i) => (
                  <Reveal key={f.user_id} index={i}>
                    <FriendRow
                      friend={f}
                      unread={unreadCounts[f.user_id] || 0}
                      onOpenChat={handleOpenChat}
                      onBookSession={handleBookSession}
                      onOpenProfile={handleOpenProfile}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </section>

          {/* RIGHT: Requests */}
          <aside className={styles.panelStack}>
            <div className={styles.panel}>
              <h3>
                Friend requests
                {incoming.length > 0 ? (
                  <span className={styles.countPill}>{incoming.length} in</span>
                ) : null}
                {outgoing.length > 0 ? (
                  <span className={`${styles.countPill} ${styles.countPillWarn}`}>
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

            <div className={styles.panel}>
              <h3>
                Session requests
                {sessIncoming.length > 0 ? (
                  <span className={styles.countPill}>
                    {sessIncoming.length} in
                  </span>
                ) : null}
                {sessOutgoing.length > 0 ? (
                  <span className={`${styles.countPill} ${styles.countPillWarn}`}>
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
      </main>

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
