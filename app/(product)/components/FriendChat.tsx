"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

type SessionRequestPayload = {
  sessionRequestId: string;
  start: string;
  durationMin: 25 | 50 | 75;
  message?: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  from_user_id: string;
  to_user_id: string;
  responseMessage?: string | null;
  sessionId?: string | null;
};

type ChatMessage = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  type: "text" | "session-request" | "system";
  content?: string | null;
  payload?: SessionRequestPayload | null;
  created_at: string;
};

export default function FriendChat({
  friendId,
  friendLabel,
  onClose,
}: {
  friendId: string;
  friendLabel: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [srOpen, setSrOpen] = useState(false);
  const [srAt, setSrAt] = useState("");
  const [srDuration, setSrDuration] = useState<25 | 50 | 75>(25);
  const [srMessage, setSrMessage] = useState("");
  const [respondNoteById, setRespondNoteById] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/${friendId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load chat");
      setMessages(data.messages || []);
      setCurrentUserId(data.currentUserId || null);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
      // mark read best-effort
      try {
        await fetch(`/api/chat/${friendId}/read`, { method: "POST" });
      } catch {}
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    load();
    // Setup SSE subscription for realtime updates
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/chat/${friendId}/events`);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          if (data?.type === 'hello' || data?.type === 'ping') return;
          // For any event, refresh messages for simplicity
          load();
        } catch {}
      };
      es.onerror = () => {
        // Allow browser to auto-reconnect; no-op
      };
    } catch {}
    return () => {
      if (es) es.close();
    };
  }, [friendId, load]);

  const sendText = async () => {
    const value = text.trim();
    if (!value) return;
    setText("");
    try {
      const res = await fetch(`/api/chat/${friendId}`);
      if (!res.ok) throw new Error("auth check failed");
      const post = await fetch(`/api/chat/${friendId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", content: value }),
      });
      const data = await post.json();
      if (!post.ok) throw new Error(data.error || "Failed to send");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const sendSessionRequest = async () => {
    try {
      if (!srAt) throw new Error("Pick date & time");
      const iso = new Date(srAt).toISOString();
      const res = await fetch(`/api/chat/${friendId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "session-request",
          start: iso,
          durationMin: srDuration,
          message: srMessage || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send request");
      setSrOpen(false);
      setSrAt("");
      setSrDuration(25);
      setSrMessage("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const actOnSessionRequest = async (
    sessionRequestId: string,
    action: "accept" | "decline"
  ) => {
    try {
      const note = respondNoteById[sessionRequestId] || undefined;
      const res = await fetch(`/api/session-requests/${sessionRequestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message: note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to respond");
      setRespondNoteById((prev) => ({ ...prev, [sessionRequestId]: "" }));
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const deleteSessionRequest = async (sessionRequestId: string) => {
    try {
      const res = await fetch(`/api/session-requests/${sessionRequestId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const renderMessage = (m: ChatMessage) => {
    if (m.type === "text") {
      return (
        <div className="whitespace-pre-wrap break-words text-sm leading-5">
          {m.content}
        </div>
      );
    }
    if (m.type === "session-request") {
      const p = (m.payload as SessionRequestPayload | null) || undefined;
      const isOwn = (p?.from_user_id ?? m.from_user_id) === currentUserId;
      return (
        <div className="text-sm">
          <div className={`rounded-md border inline-flex items-center gap-2 px-2 py-1 text-xs font-medium ${
            p?.status === "accepted"
              ? "bg-green-100 text-green-700 border-green-200"
              : p?.status === "declined"
              ? "bg-red-100 text-red-700 border-red-200"
              : p?.status === "cancelled"
              ? "bg-gray-100 text-gray-700 border-gray-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>Session request</div>
          <div className="mt-1 text-sm">
            {new Date(p?.start ?? "").toLocaleString()} · {p?.durationMin} min
            {p?.message ? <span className="ml-2 italic">“{p.message}”</span> : null}
          </div>
          {p?.status === "pending" ? (
            <div className="mt-2 flex items-center gap-2">
              {!isOwn ? (
                <>
                  <input
                    type="text"
                    placeholder="Optional message"
                    className="w-44 rounded border px-2 py-1 text-xs"
                    value={respondNoteById[p?.sessionRequestId ?? ""] || ""}
                    onChange={(e) =>
                      setRespondNoteById((prev) => ({ ...prev, [p?.sessionRequestId ?? ""]: e.target.value }))
                    }
                  />
                  <button
                    onClick={() => {
                      if (!p?.sessionRequestId) return;
                      actOnSessionRequest(p.sessionRequestId, "accept");
                    }}
                    className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      if (!p?.sessionRequestId) return;
                      actOnSessionRequest(p.sessionRequestId, "decline");
                    }}
                    className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Decline
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    if (!p?.sessionRequestId) return;
                    deleteSessionRequest(p.sessionRequestId);
                  }}
                  className="rounded-md bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                >
                  Delete request
                </button>
              )}
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500 capitalize">Status: {p?.status}</div>
          )}
        </div>
      );
    }
    return <div className="text-xs text-gray-500">Unsupported message</div>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex w-full max-w-lg flex-col rounded-md bg-[#18181b] shadow-2xl border border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-800 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-700 text-[10px] font-semibold text-white">
              {friendLabel?.[0]?.toUpperCase?.() || "F"}
            </div>
            <div className="text-sm font-semibold text-gray-100">{friendLabel}</div>
          </div>
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-200">
            Close
          </button>
        </div>
        {error && <div className="px-3 py-2 text-xs text-red-400">{error}</div>}
        <div ref={listRef} className="flex max-h-[70vh] flex-1 flex-col overflow-y-auto p-3">
          {loading && messages.length === 0 ? (
            <div className="text-xs text-gray-500">Loading…</div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((m) => {
                const isOwn = currentUserId ? m.from_user_id === currentUserId : false;
                return (
                  <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-lg border p-2 shadow-sm ${
                        isOwn ? "bg-indigo-900 border-indigo-700 text-indigo-100" : "bg-gray-900 border-gray-700 text-gray-200"
                      }`}
                    >
                      {renderMessage(m)}
                      <div className="mt-1 text-[10px] text-gray-500">
                        {new Date(m.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 border-t border-gray-800 bg-[#18181b] p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message"
              className="flex-1 rounded border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1 text-sm focus:outline-none focus:border-indigo-700"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendText();
              }}
            />
            <button
              onClick={sendText}
              className="rounded-md bg-indigo-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-800"
            >
              Send (Ctrl+Enter)
            </button>
            <button
              onClick={() => setSrOpen((v) => !v)}
              className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
            >
              Session
            </button>
          </div>
          {srOpen && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <input
                type="datetime-local"
                className="rounded border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1 text-xs"
                value={srAt}
                onChange={(e) => setSrAt(e.target.value)}
              />
              <select
                className="rounded border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1 text-xs"
                value={srDuration}
                onChange={(e) => setSrDuration(Number(e.target.value) as 25 | 50 | 75)}
              >
                <option value={25}>25 min</option>
                <option value={50}>50 min</option>
                <option value={75}>75 min</option>
              </select>
              <input
                type="text"
                placeholder="Message (optional)"
                className="w-48 rounded border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1 text-xs"
                value={srMessage}
                onChange={(e) => setSrMessage(e.target.value)}
              />
              <button
                onClick={sendSessionRequest}
                className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
              >
                Send request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


