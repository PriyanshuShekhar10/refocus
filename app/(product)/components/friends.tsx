"use client";
import React, { useEffect, useState } from "react";
import FriendChat from "./FriendChat";

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
  since?: string;
};

type SessionRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_user_email?: string;
  to_user_email?: string;
  start: string; // ISO
  durationMin: 25 | 50 | 75;
  message?: string | null;
  responseMessage?: string | null;
  status: "pending" | "accepted" | "declined";
  created_at?: string;
  responded_at?: string | null;
};

export default function Friends() {
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessIncoming, setSessIncoming] = useState<SessionRequest[]>([]);
  const [sessOutgoing, setSessOutgoing] = useState<SessionRequest[]>([]);
  const [composeFor, setComposeFor] = useState<string | null>(null);
  const [composeAt, setComposeAt] = useState<string>(""); // datetime-local value
  const [composeDuration, setComposeDuration] = useState<25 | 50 | 75>(25);
  const [composeMessage, setComposeMessage] = useState<string>("");
  const [respondNoteById, setRespondNoteById] = useState<Record<string, string>>({});
  const [openChatFriendId, setOpenChatFriendId] = useState<string | null>(null);
  const [openChatFriendLabel, setOpenChatFriendLabel] = useState<string>("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

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
        throw new Error(dataSessIn.error || "Failed to load incoming session requests");
      if (!resSessOut.ok)
        throw new Error(dataSessOut.error || "Failed to load outgoing session requests");
      setIncoming(dataIncoming.requests || []);
      setOutgoing(dataOutgoing.requests || []);
      setFriends(dataFriends.friends || []);
      setSessIncoming(dataSessIn.requests || []);
      setSessOutgoing(dataSessOut.requests || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // load unread counts
    (async () => {
      try {
        const res = await fetch("/api/chat/unread-counts");
        const data = await res.json();
        if (res.ok) setUnreadCounts(data.counts || {});
      } catch {}
    })();
    // subscribe to global chat events for unread updates
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/chat/events");
      es.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data || '{}');
          if (d?.type === 'unread:update') {
            setUnreadCounts((prev) => ({ ...prev, [d.payload.friendId]: d.payload.count }));
          } else if (d?.type === 'unread:inc') {
            setUnreadCounts((prev) => {
              const curr = prev[d.payload.friendId] || 0;
              return { ...prev, [d.payload.friendId]: curr + (d.payload.delta || 1) };
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

  const sendSessionRequest = async (toUserId: string) => {
    try {
      if (!composeAt) throw new Error("Please select date & time");
      const isoStart = new Date(composeAt).toISOString();
      const res = await fetch("/api/session-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: toUserId,
          start: isoStart,
          durationMin: composeDuration,
          message: composeMessage || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send session request");
      setComposeFor(null);
      setComposeAt("");
      setComposeDuration(25);
      setComposeMessage("");
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const respondSessionRequest = async (
    id: string,
    action: "accept" | "decline"
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

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Incoming friend requests</h2>
      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="divide-y rounded-md border">
        {incoming.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No incoming requests</div>
        ) : (
          incoming.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div className="text-sm">
                From:{" "}
                {r.from_user_email ? (
                  <span className="font-mono">{r.from_user_email}</span>
                ) : (
                  <span className="font-mono">{r.from_user_id}</span>
                )}
                <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs uppercase">
                  {r.status}
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
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <h2 className="text-lg font-semibold">Outgoing friend requests</h2>
      <div className="divide-y rounded-md border">
        {outgoing.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No outgoing requests</div>
        ) : (
          outgoing.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div className="text-sm">
                To:{" "}
                {r.to_user_email ? (
                  <span className="font-mono">{r.to_user_email}</span>
                ) : (
                  <span className="font-mono">{r.to_user_id}</span>
                )}
                <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs uppercase">
                  {r.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <h2 className="text-lg font-semibold">Incoming session requests</h2>
      <div className="divide-y rounded-md border">
        {sessIncoming.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No incoming session requests</div>
        ) : (
          sessIncoming.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div className="text-sm">
                From: {r.from_user_email ? (
                  <span className="font-mono">{r.from_user_email}</span>
                ) : (
                  <span className="font-mono">{r.from_user_id}</span>
                )}
                <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs uppercase">
                  {r.status}
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(r.start).toLocaleString()} · {r.durationMin} min
                  {r.message ? <span className="ml-2 italic">“{r.message}”</span> : null}
                </div>
              </div>
              {r.status === "pending" && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Optional message"
                    className="w-40 rounded border px-2 py-1 text-xs"
                    value={respondNoteById[r.id] || ""}
                    onChange={(e) =>
                      setRespondNoteById((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                  />
                  <button
                    onClick={() => respondSessionRequest(r.id, "accept")}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondSessionRequest(r.id, "decline")}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <h2 className="text-lg font-semibold">Outgoing session requests</h2>
      <div className="divide-y rounded-md border">
        {sessOutgoing.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No outgoing session requests</div>
        ) : (
          sessOutgoing.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div className="text-sm">
                To: {r.to_user_email ? (
                  <span className="font-mono">{r.to_user_email}</span>
                ) : (
                  <span className="font-mono">{r.to_user_id}</span>
                )}
                <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs uppercase">
                  {r.status}
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(r.start).toLocaleString()} · {r.durationMin} min
                  {r.message ? <span className="ml-2 italic">“{r.message}”</span> : null}
                </div>
                {r.responseMessage ? (
                  <div className="text-xs text-gray-500 mt-1">Response: “{r.responseMessage}”</div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <h2 className="text-lg font-semibold">Friends</h2>
      <div className="divide-y rounded-md border">
        {friends.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No friends yet</div>
        ) : (
          friends.map((f) => (
            <div
              key={f.user_id}
              className="flex items-center justify-between p-3"
            >
              <div className="text-sm">
                <span className="font-mono">{f.email || f.user_id}</span>
                {f.name ? (
                  <span className="ml-2 text-gray-500">({f.name})</span>
                ) : null}
                {!!unreadCounts[f.user_id] && (
                  <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCounts[f.user_id]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {composeFor === f.user_id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      className="rounded border px-2 py-1 text-xs"
                      value={composeAt}
                      onChange={(e) => setComposeAt(e.target.value)}
                    />
                    <select
                      className="rounded border px-2 py-1 text-xs"
                      value={composeDuration}
                      onChange={(e) =>
                        setComposeDuration(Number(e.target.value) as 25 | 50 | 75)
                      }
                    >
                      <option value={25}>25 min</option>
                      <option value={50}>50 min</option>
                      <option value={75}>75 min</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Message (optional)"
                      className="w-48 rounded border px-2 py-1 text-xs"
                      value={composeMessage}
                      onChange={(e) => setComposeMessage(e.target.value)}
                    />
                    <button
                      onClick={() => sendSessionRequest(f.user_id)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => {
                        setComposeFor(null);
                        setComposeAt("");
                        setComposeDuration(25);
                        setComposeMessage("");
                      }}
                      className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>

                    <button
                      onClick={() => {
                        setOpenChatFriendId(f.user_id);
                        setOpenChatFriendLabel(f.email || f.user_id);
                      }}
                      className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                    >
                      Chat
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {openChatFriendId && (
        <FriendChat
          friendId={openChatFriendId}
          friendLabel={openChatFriendLabel}
          onClose={() => setOpenChatFriendId(null)}
        />
      )}
    </div>
  );
}
