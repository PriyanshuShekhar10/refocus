"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiMinus, FiMaximize2, FiX } from "react-icons/fi";

type SessionRequestPayload = {
  sessionRequestId: string;
  start: string;
  durationMin: 25 | 50 | 75;
  message?: string | null;
  goal?: string | null;
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

export type FriendChatProps = {
  friendId: string;
  friendLabel: string;
  onClose: () => void;
  layout?: "modal" | "docked";
  minimized?: boolean;
  onMinimizeToggle?: () => void;
  className?: string;
};

export default function FriendChat({
  friendId,
  friendLabel,
  onClose,
  layout = "modal",
  minimized = false,
  onMinimizeToggle,
}: FriendChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [srOpen, setSrOpen] = useState(false);
  const [srDate, setSrDate] = useState<Date | null>(null);
  const [srHour, setSrHour] = useState<number | null>(null);
  const [srMinute, setSrMinute] = useState<number>(0);
  const [srDuration, setSrDuration] = useState<25 | 50 | 75>(25);
  const [srMessage, setSrMessage] = useState("");
  const [srGoal, setSrGoal] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [busySlots, setBusySlots] = useState<{
    myBusySlots: Array<{ start: string; end: string }>;
    friendBusySlots: Array<{ start: string; end: string }>;
  }>({ myBusySlots: [], friendBusySlots: [] });
  const [loadingBusy, setLoadingBusy] = useState(false);

  const refineGoal = async () => {
    if (!srGoal.trim()) return;
    setIsRefining(true);
    try {
      const res = await fetch("/api/ai/refine-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: srGoal }),
      });
      const data = await res.json();
      if (data.refinedGoal) {
        setSrGoal(data.refinedGoal);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefining(false);
    }
  };

  // Fetch busy slots when panel opens or date changes
  useEffect(() => {
    if (!srOpen) return;
    
    const fetchBusySlots = async () => {
      setLoadingBusy(true);
      try {
        // Fetch for the next 7 days
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        const to = new Date(from);
        to.setDate(to.getDate() + 8);
        
        const res = await fetch(
          `/api/sessions/busy?from=${from.toISOString()}&to=${to.toISOString()}&friendId=${friendId}`
        );
        if (res.ok) {
          const data = await res.json();
          setBusySlots(data);
        }
      } catch {
        // Silently fail - slots will just not show conflicts
      } finally {
        setLoadingBusy(false);
      }
    };
    
    fetchBusySlots();
  }, [srOpen, friendId]);

  // Check if a specific time slot has a conflict
  const getSlotConflict = useCallback(
    (date: Date | null, hour: number, minute: number, durationMin: number): { hasConflict: boolean; isMine: boolean; isFriend: boolean } => {
      if (!date) return { hasConflict: false, isMine: false, isFriend: false };
      
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000);
      const slotStartMs = slotStart.getTime();
      const slotEndMs = slotEnd.getTime();
      
      let isMine = false;
      let isFriend = false;
      
      // Check my busy slots
      for (const slot of busySlots.myBusySlots) {
        const busyStart = new Date(slot.start).getTime();
        const busyEnd = new Date(slot.end).getTime();
        // Overlap check: slotStart < busyEnd AND slotEnd > busyStart
        if (slotStartMs < busyEnd && slotEndMs > busyStart) {
          isMine = true;
          break;
        }
      }
      
      // Check friend's busy slots
      for (const slot of busySlots.friendBusySlots) {
        const busyStart = new Date(slot.start).getTime();
        const busyEnd = new Date(slot.end).getTime();
        if (slotStartMs < busyEnd && slotEndMs > busyStart) {
          isFriend = true;
          break;
        }
      }
      
      return { hasConflict: isMine || isFriend, isMine, isFriend };
    },
    [busySlots]
  );

  // Generate quick date options
  const dateOptions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const options: { label: string; date: Date }[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      let label: string;
      if (i === 0) label = "Today";
      else if (i === 1) label = "Tomorrow";
      else label = `${dayNames[d.getDay()]} ${d.getDate()}`;
      options.push({ label, date: d });
    }
    return options;
  }, []);

  // Generate time slots (12 AM to 11 PM, full 24 hours)
  const timeSlots = useMemo(() => {
    const slots: { hour: number; label: string }[] = [];
    for (let h = 0; h <= 23; h++) {
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      slots.push({ hour: h, label: `${hour12} ${ampm}` });
    }
    return slots;
  }, []);

  // Check if a time slot is in the past
  const isTimeSlotPast = useCallback((date: Date | null, hour: number) => {
    if (!date) return false;
    const now = new Date();
    const slotTime = new Date(date);
    slotTime.setHours(hour, 0, 0, 0);
    return slotTime <= now;
  }, []);
  const [respondNoteById, setRespondNoteById] = useState<
    Record<string, string>
  >({});
  const listRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/${friendId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load chat");
      const fromServer = (data.messages || []) as ChatMessage[];
      setMessages((prev) => {
        const optimisticOnly = prev.filter((m) => m.id.startsWith("temp-"));
        if (optimisticOnly.length === 0) return fromServer;
        const serverIds = new Set(fromServer.map((m) => m.id));
        return [...fromServer, ...optimisticOnly.filter((m) => !serverIds.has(m.id))];
      });
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
          const data = JSON.parse(ev.data || "{}");
          if (data?.type === "hello" || data?.type === "ping") return;
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
    if (!value || !currentUserId) return;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      from_user_id: currentUserId,
      to_user_id: friendId,
      type: "text",
      content: value,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setError(null);
    setIsSending(true);
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
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m))
      );
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(value);
      setError((e as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  const sendSessionRequest = async () => {
    try {
      if (!srDate || srHour === null) throw new Error("Pick date & time");
      const startTime = new Date(srDate);
      startTime.setHours(srHour, srMinute, 0, 0);
      
      // Validate not in the past
      if (startTime <= new Date()) {
        throw new Error("Cannot schedule in the past");
      }
      
      const iso = startTime.toISOString();
      const res = await fetch(`/api/chat/${friendId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "session-request",
          start: iso,
          durationMin: srDuration,
          message: srMessage || undefined,
          goal: srGoal || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send request");
      setSrOpen(false);
      setSrDate(null);
      setSrHour(null);
      setSrMinute(0);
      setSrDuration(25);
      setSrMessage("");
      setSrGoal("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const actOnSessionRequest = async (
    sessionRequestId: string,
    action: "accept" | "decline",
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
          <div
            className={`rounded-md border inline-flex items-center gap-2 px-2 py-1 text-xs font-medium ${
              p?.status === "accepted"
                ? "bg-green-100 text-green-700 border-green-200"
                : p?.status === "declined"
                  ? "bg-red-100 text-red-700 border-red-200"
                  : p?.status === "cancelled"
                    ? "bg-gray-100 text-gray-700 border-gray-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            Session request
          </div>
          <div className="mt-1 text-sm">
            {new Date(p?.start ?? "").toLocaleString()} · {p?.durationMin} min
            {p?.message ? (
              <span className="ml-2 italic">“{p.message}”</span>
            ) : null}
            {p?.goal ? (
              <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                <strong>Goal:</strong> {p.goal}
              </div>
            ) : null}
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
                      setRespondNoteById((prev) => ({
                        ...prev,
                        [p?.sessionRequestId ?? ""]: e.target.value,
                      }))
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
            <div className="mt-2 text-xs text-gray-500 capitalize">
              Status: {p?.status}
            </div>
          )}
        </div>
      );
    }
    return <div className="text-xs text-gray-500">Unsupported message</div>;
  };

  const header = (
    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-3 h-10">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-[10px] font-semibold text-white">
          {friendLabel?.[0]?.toUpperCase?.() || "F"}
        </div>
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
          {friendLabel}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onMinimizeToggle ? (
          <button
            onClick={onMinimizeToggle}
            aria-label={minimized ? "Maximize chat" : "Minimize chat"}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {minimized ? <FiMaximize2 size={14} /> : <FiMinus size={14} />}
          </button>
        ) : null}
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <FiX size={14} />
        </button>
      </div>
    </div>
  );

  const body = (
    <>
      {error && (
        <div className="px-3 py-2 text-xs text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      <div
        ref={listRef}
        className={`flex flex-1 flex-col overflow-y-auto p-3 ${layout === "docked" ? "min-h-0" : ""}`}
      >
        {loading && messages.length === 0 ? (
          <div className="text-xs text-gray-500">Loading…</div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const isOwn = currentUserId
                ? m.from_user_id === currentUserId
                : false;
              return (
                <div
                  key={m.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg border p-2 shadow-sm ${
                      isOwn
                        ? "bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-100"
                        : "bg-gray-100 border-gray-300 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
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
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message"
            className="flex-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-700"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText();
              }
            }}
          />
          <button
            onClick={sendText}
            disabled={isSending}
            className="rounded-md bg-indigo-600 dark:bg-indigo-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
          <button
            onClick={() => setSrOpen((v) => !v)}
            className="rounded-md bg-green-600 dark:bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 dark:hover:bg-green-800"
          >
            Session
          </button>
        </div>
        {srOpen && (
          <div
            className={`mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3 ${
              layout === "docked"
                ? "max-h-[200px] overflow-y-auto overflow-x-hidden p-2"
                : "p-3"
            }`}
          >
            {/* Date Selection */}
            <div className={layout === "docked" ? "space-y-1" : ""}>
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                Pick a day
              </label>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {dateOptions.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSrDate(opt.date);
                      // Reset hour if switching dates and current hour is past
                      if (srHour !== null && isTimeSlotPast(opt.date, srHour)) {
                        setSrHour(null);
                      }
                    }}
                    className={`shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      srDate?.toDateString() === opt.date.toDateString()
                        ? "bg-indigo-600 text-white"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            {srDate && (
              <div className={layout === "docked" ? "space-y-1" : ""}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Pick a time
                  </label>
                  {loadingBusy && (
                    <span className="text-[10px] text-gray-400">Checking...</span>
                  )}
                </div>
                {/* Legend - hide in docked to save space */}
                {layout !== "docked" && (
                  <div className="flex gap-3 mb-2 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      <span className="text-gray-500 dark:text-gray-400">You&apos;re busy</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                      <span className="text-gray-500 dark:text-gray-400">Friend busy</span>
                    </span>
                  </div>
                )}
                <div className={`grid gap-1 ${layout === "docked" ? "grid-cols-6" : "grid-cols-6"}`}>
                  {timeSlots.map((slot) => {
                    const isPast = isTimeSlotPast(srDate, slot.hour);
                    // Check conflict for this hour with default duration
                    const conflict = getSlotConflict(srDate, slot.hour, 0, srDuration);
                    const isDisabled = isPast || conflict.hasConflict;
                    
                    return (
                      <button
                        key={slot.hour}
                        onClick={() => !isDisabled && setSrHour(slot.hour)}
                        disabled={isDisabled}
                        title={
                          conflict.isMine && conflict.isFriend
                            ? "Both of you are busy"
                            : conflict.isMine
                              ? "You have a session"
                              : conflict.isFriend
                                ? "Friend has a session"
                                : undefined
                        }
                        className={`relative rounded font-medium transition-colors ${
                          layout === "docked"
                            ? "px-1 py-1 text-[10px]"
                            : "px-1.5 py-1.5 text-[11px]"
                        } ${
                          isPast
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                            : conflict.hasConflict
                              ? conflict.isMine
                                ? "bg-red-100 dark:bg-red-900/30 text-red-400 dark:text-red-400 cursor-not-allowed border border-red-200 dark:border-red-800"
                                : "bg-orange-100 dark:bg-orange-900/30 text-orange-400 dark:text-orange-400 cursor-not-allowed border border-orange-200 dark:border-orange-800"
                              : srHour === slot.hour
                                ? "bg-indigo-600 text-white"
                                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
                {/* Fine-tune minutes */}
                {srHour !== null && (
                  <div className={`flex items-center gap-2 ${layout === "docked" ? "mt-1" : "mt-2"}`}>
                    <span className={`text-gray-500 dark:text-gray-400 ${layout === "docked" ? "text-[10px]" : "text-xs"}`}>Minutes:</span>
                    <div className="flex gap-1">
                      {[0, 15, 30, 45].map((m) => {
                        const minuteConflict = getSlotConflict(srDate, srHour, m, srDuration);
                        return (
                          <button
                            key={m}
                            onClick={() => !minuteConflict.hasConflict && setSrMinute(m)}
                            disabled={minuteConflict.hasConflict}
                            title={
                              minuteConflict.isMine && minuteConflict.isFriend
                                ? "Both busy"
                                : minuteConflict.isMine
                                  ? "You have a session"
                                  : minuteConflict.isFriend
                                    ? "Friend has a session"
                                    : undefined
                            }
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                              minuteConflict.hasConflict
                                ? minuteConflict.isMine
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-400 cursor-not-allowed"
                                  : "bg-orange-100 dark:bg-orange-900/30 text-orange-400 cursor-not-allowed"
                                : srMinute === m
                                  ? "bg-indigo-600 text-white"
                                  : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
                            }`}
                        >
                          :{m.toString().padStart(2, "0")}
                        </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Duration Selection */}
            {srDate && srHour !== null && (
              <div className={layout === "docked" ? "space-y-1" : ""}>
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Duration
                </label>
                <div className="flex gap-1">
                  {([25, 50, 75] as const).map((d) => {
                    const durationConflict = getSlotConflict(srDate, srHour, srMinute, d);
                    return (
                      <button
                        key={d}
                        onClick={() => !durationConflict.hasConflict && setSrDuration(d)}
                        disabled={durationConflict.hasConflict}
                        title={
                          durationConflict.hasConflict
                            ? `${d} min would overlap with ${durationConflict.isMine ? "your" : "friend's"} session`
                            : undefined
                        }
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          durationConflict.hasConflict
                            ? durationConflict.isMine
                              ? "bg-red-100 dark:bg-red-900/30 text-red-400 cursor-not-allowed border border-red-200 dark:border-red-800"
                              : "bg-orange-100 dark:bg-orange-900/30 text-orange-400 cursor-not-allowed border border-orange-200 dark:border-orange-800"
                            : srDuration === d
                              ? "bg-green-600 text-white"
                              : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
                        }`}
                      >
                        {d} min
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Goal Selection */}
            {srDate && srHour !== null && (
              <div className={layout === "docked" ? "space-y-1" : "mt-2"}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Session Goal
                  </label>
                  <button
                    type="button"
                    onClick={refineGoal}
                    disabled={isRefining || !srGoal.trim()}
                    className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isRefining ? (
                      <>
                        <span className="animate-spin">✦</span> Refining...
                      </>
                    ) : (
                      <>✦ AI Refine</>
                    )}
                  </button>
                </div>
                <textarea
                  placeholder="What specifically do you want to accomplish?"
                  className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-xs placeholder:text-gray-400 min-h-[38px] resize-y"
                  value={srGoal}
                  onChange={(e) => setSrGoal(e.target.value)}
                />
              </div>
            )}

            {/* Message & Send */}
            {srDate && srHour !== null && (() => {
              const finalConflict = getSlotConflict(srDate, srHour, srMinute, srDuration);
              return (
                <div className="space-y-2">
                  {finalConflict.hasConflict ? (
                    <div className={`p-2 rounded-md text-xs ${
                      finalConflict.isMine
                        ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                    }`}>
                      {finalConflict.isMine && finalConflict.isFriend
                        ? "⚠️ Both of you have sessions during this time"
                        : finalConflict.isMine
                          ? "⚠️ You have a session during this time"
                          : "⚠️ Your friend has a session during this time"}
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Add a message (optional)"
                        className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-xs placeholder:text-gray-400"
                        value={srMessage}
                        onChange={(e) => setSrMessage(e.target.value)}
                      />
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          <span className="text-green-600 dark:text-green-400">✓ Both available</span>
                          {" · "}
                          {(() => {
                            const d = new Date(srDate);
                            d.setHours(srHour, srMinute, 0, 0);
                            return d.toLocaleString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            });
                          })()}{" "}
                          · {srDuration} min
                        </div>
                        <button
                          onClick={sendSessionRequest}
                          className="rounded-md bg-green-600 hover:bg-green-700 px-4 py-2 text-xs font-medium text-white transition-colors"
                        >
                          Send Request
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Close button */}
            <button
              onClick={() => {
                setSrOpen(false);
                setSrDate(null);
                setSrHour(null);
                setSrMinute(0);
              }}
              className="w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-1"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (layout === "docked") {
    return (
      <div
        className={`flex w-[320px] h-[380px] min-w-[300px] min-h-[320px] flex-col rounded-md bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 animate-[slide-up_180ms_ease-out] ${
          minimized ? "h-10" : ""
        }`}
        style={{ transformOrigin: "bottom left" }}
      >
        {header}
        {minimized ? <div className="hidden" /> : body}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="flex w-full max-w-lg max-h-[80vh] flex-col rounded-md bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 animate-[scale-in_180ms_ease-out]"
        style={{ transformOrigin: "center" }}
      >
        {header}
        {body}
      </div>
    </div>
  );
}
