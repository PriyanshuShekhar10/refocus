"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiMinus,
  FiMaximize2,
  FiX,
  FiSend,
  FiCalendar,
  FiMessageCircle,
  FiMoreHorizontal,
} from "react-icons/fi";
import { getAblyClient } from "@/lib/ably-client";
import { chatChannel } from "@/lib/realtimeChannels";

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
  edited_at?: string | null;
  deleted?: boolean;
  deleted_at?: string | null;
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [pendingMessageOps, setPendingMessageOps] = useState<Set<string>>(
    new Set(),
  );
  const [menuOpenMessageId, setMenuOpenMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpenMessageId) return;
    const onDocPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest("[data-chat-message-menu]")) return;
      setMenuOpenMessageId(null);
    };
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [menuOpenMessageId]);

  const formatDateSeparator = useCallback((date: Date) => {
    const now = new Date();
    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round(
      (startOfDay(now) - startOfDay(date)) / 86400000,
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays > 1 && diffDays < 7) {
      return date.toLocaleDateString(undefined, { weekday: "long" });
    }
    return date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
    });
  }, []);

  const formatTime = useCallback((iso: string) => {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

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
  const shouldAutoScrollRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior });
  }, []);

  const handleListScroll = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const distanceFromBottom = list.scrollHeight - (list.scrollTop + list.clientHeight);
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  }, []);

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
      shouldAutoScrollRef.current = true;
      requestAnimationFrame(() => scrollToBottom());
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
    let isUnmounted = false;
    const channelName = currentUserId
      ? chatChannel(currentUserId, friendId)
      : null;
    if (!channelName) return;

    const client = getAblyClient();
    const channel = client.channels.get(channelName);
    const onEvent = (message: { data?: unknown }) => {
      if (isUnmounted) return;
      const data = message.data as { type?: string; payload?: unknown } | undefined;
      if (!data?.type) return;

      if (
        (data.type === "message:new" || data.type === "session-request:new") &&
        data.payload
      ) {
        const incoming = data.payload as ChatMessage;
        if (incoming.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            const optIdx = prev.findIndex(
              (m) =>
                m.id.startsWith("temp-") &&
                m.from_user_id === incoming.from_user_id &&
                m.content === incoming.content,
            );
            if (optIdx !== -1) {
              const updated = [...prev];
              updated[optIdx] = incoming;
              return updated;
            }
            return [...prev, incoming];
          });
          try {
            fetch(`/api/chat/${friendId}/read`, { method: "POST" });
          } catch {}
          return;
        }
      }

      if (data.type === "message:updated" && data.payload) {
        const payload = data.payload as {
          id?: string;
          content?: string;
          edited_at?: string | null;
        };
        if (payload.id && typeof payload.content === "string") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.id
                ? {
                    ...m,
                    content: payload.content,
                    edited_at: payload.edited_at ?? new Date().toISOString(),
                    deleted: false,
                  }
                : m,
            ),
          );
          return;
        }
      }

      if (data.type === "message:deleted" && data.payload) {
        const payload = data.payload as {
          id?: string;
          content?: string;
          deleted_at?: string | null;
        };
        if (payload.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.id
                ? {
                    ...m,
                    content: payload.content ?? "[This message was deleted]",
                    deleted: true,
                    deleted_at: payload.deleted_at ?? new Date().toISOString(),
                    edited_at: null,
                  }
                : m,
            ),
          );
          return;
        }
      }

      // session-request:update and any unknown event => refresh list
      load();
    };

    channel.subscribe("event", onEvent);
    return () => {
      isUnmounted = true;
      channel.unsubscribe("event", onEvent);
    };
  }, [currentUserId, friendId, load]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    requestAnimationFrame(() => scrollToBottom());
  }, [messages, scrollToBottom]);

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
      shouldAutoScrollRef.current = true;
      requestAnimationFrame(() => scrollToBottom("smooth"));
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

  const beginEditMessage = (message: ChatMessage) => {
    if (message.type !== "text") return;
    setEditingMessageId(message.id);
    setEditingText(message.content ?? "");
  };

  const saveEditedMessage = async (messageId: string) => {
    const content = editingText.trim();
    if (!content) {
      setError("Message cannot be empty");
      return;
    }
    setPendingMessageOps((prev) => new Set(prev).add(messageId));
    try {
      const res = await fetch(`/api/chat/${friendId}/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to edit message");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content, edited_at: new Date().toISOString(), deleted: false }
            : m,
        ),
      );
      setEditingMessageId(null);
      setEditingText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPendingMessageOps((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  };

  const deleteTextMessage = async (messageId: string) => {
    setPendingMessageOps((prev) => new Set(prev).add(messageId));
    try {
      const res = await fetch(`/api/chat/${friendId}/${messageId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete message");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: "[This message was deleted]",
                deleted: true,
                deleted_at: new Date().toISOString(),
                edited_at: null,
              }
            : m,
        ),
      );
      if (editingMessageId === messageId) {
        setEditingMessageId(null);
        setEditingText("");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPendingMessageOps((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  };

  const renderMessage = (m: ChatMessage) => {
    if (m.type === "text") {
      const isEditing = editingMessageId === m.id;
      return (
        <div>
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[220px]">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium text-white/70">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#FFB090]" />
                Editing message
              </div>
              <textarea
                autoFocus
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveEditedMessage(m.id);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingMessageId(null);
                    setEditingText("");
                  }
                }}
                rows={Math.min(6, Math.max(2, editingText.split("\n").length))}
                className="w-full resize-none rounded-xl bg-white/15 px-3 py-2 text-sm text-white placeholder:text-white/60 ring-1 ring-inset ring-white/15 focus:outline-none focus:ring-white/40 focus:bg-white/20 transition-colors"
                placeholder="Edit your message…"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-white/60 hidden sm:inline">
                  Enter to save · Esc to cancel
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMessageId(null);
                      setEditingText("");
                    }}
                    disabled={pendingMessageOps.has(m.id)}
                    className="rounded-full px-3 py-1 text-[11px] font-medium text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-60 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEditedMessage(m.id)}
                    disabled={
                      pendingMessageOps.has(m.id) ||
                      !editingText.trim() ||
                      editingText.trim() === (m.content ?? "").trim()
                    }
                    className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#5D1C6A] hover:bg-[#FFF1D3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {pendingMessageOps.has(m.id) ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`whitespace-pre-wrap break-words text-sm leading-5 ${
                m.deleted ? "italic opacity-80" : ""
              }`}
            >
              {m.content}
            </div>
          )}
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
                ? "bg-[#FFF1D3] text-[#5D1C6A] border-[#FFB090]"
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
              <div className="mt-1 text-xs text-[#5D1C6A] dark:text-[#FFB090] bg-[#FFF1D3] dark:bg-[#5D1C6A]/30 px-2 py-1 rounded">
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
                    className="rounded-md bg-[#5D1C6A] px-3 py-1 text-xs font-medium text-white hover:bg-[#CA5995]"
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

  const isModal = layout === "modal";
  const header = (
    <div
      className={`flex items-center justify-between border-b border-gray-200/70 dark:border-gray-800 bg-white/95 dark:bg-gray-900/80 backdrop-blur-sm ${
        isModal ? "px-5 py-4" : "px-3 h-10"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex shrink-0 items-center justify-center rounded-full bg-[#FFF1D3] dark:bg-[#5D1C6A]/70 text-[#5D1C6A] dark:text-[#FFB090] font-semibold ${
            isModal ? "h-10 w-10 text-sm" : "h-6 w-6 text-[10px]"
          }`}
        >
          {friendLabel?.[0]?.toUpperCase?.() || "F"}
        </div>
        <div className="min-w-0">
          <div
            className={`font-semibold text-gray-900 dark:text-gray-100 truncate ${
              isModal ? "text-base max-w-[260px]" : "text-sm max-w-[200px]"
            }`}
          >
            {friendLabel}
          </div>
          {isModal && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Direct message
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {onMinimizeToggle ? (
          <button
            onClick={onMinimizeToggle}
            aria-label={minimized ? "Maximize chat" : "Minimize chat"}
            className={`inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              isModal ? "h-8 w-8" : "h-6 w-6"
            }`}
          >
            {minimized ? <FiMaximize2 size={isModal ? 16 : 14} /> : <FiMinus size={isModal ? 16 : 14} />}
          </button>
        ) : null}
        <button
          onClick={onClose}
          aria-label="Close chat"
          className={`inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
            isModal ? "h-8 w-8" : "h-6 w-6"
          }`}
        >
          <FiX size={isModal ? 16 : 14} />
        </button>
      </div>
    </div>
  );

  const body = (
    <>
      {error && (
        <div className="mx-3 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      <div
        ref={listRef}
        className={`flex flex-1 flex-col overflow-y-auto ${
          isModal ? "px-5 py-4" : "p-3"
        } ${layout === "docked" ? "min-h-0" : ""} bg-gradient-to-b from-white to-[#FFF7E6]/40 dark:from-gray-900 dark:to-gray-900`}
        onScroll={handleListScroll}
      >
        {loading && messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-xs text-gray-500">
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
            <div
              className={`flex items-center justify-center rounded-full bg-[#FFF1D3] dark:bg-[#5D1C6A]/40 ${
                isModal ? "h-14 w-14 mb-4" : "h-10 w-10 mb-3"
              }`}
            >
              <FiMessageCircle
                className={`text-[#5D1C6A] dark:text-[#FFB090] ${
                  isModal ? "w-6 h-6" : "w-5 h-5"
                }`}
              />
            </div>
            <p
              className={`font-semibold text-gray-900 dark:text-gray-100 ${
                isModal ? "text-base" : "text-sm"
              }`}
            >
              Say hi to {friendLabel.split(/[@\s]/)[0] || "your friend"}
            </p>
            <p
              className={`mt-1 max-w-[260px] text-gray-500 dark:text-gray-400 ${
                isModal ? "text-sm" : "text-xs"
              }`}
            >
              Start the conversation, or send a session request to focus together.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {(() => {
              const nodes: React.ReactNode[] = [];
              let lastDateKey: string | null = null;
              for (const m of messages) {
                const created = new Date(m.created_at);
                const dateKey = created.toDateString();
                if (dateKey !== lastDateKey) {
                  nodes.push(
                    <div
                      key={`sep-${dateKey}-${m.id}`}
                      className="flex items-center justify-center py-2"
                    >
                      <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {formatDateSeparator(created)}
                      </span>
                    </div>,
                  );
                  lastDateKey = dateKey;
                }
                const isOwn = currentUserId
                  ? m.from_user_id === currentUserId
                  : false;
                const isEditingThisMessage = editingMessageId === m.id;
                const canEditOrDelete =
                  isOwn && m.type === "text" && !m.deleted && !isEditingThisMessage;
                const isMenuOpen = menuOpenMessageId === m.id;
                nodes.push(
                  <div
                    key={m.id}
                    className={`group flex items-end gap-1.5 ${
                      isOwn ? "justify-end" : "justify-start"
                    }`}
                  >
                    {canEditOrDelete && (
                      <div
                        className="relative order-first"
                        data-chat-message-menu
                      >
                        <button
                          type="button"
                          aria-label="Message options"
                          onClick={() =>
                            setMenuOpenMessageId((prev) =>
                              prev === m.id ? null : m.id,
                            )
                          }
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-opacity ${
                            isMenuOpen
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                          }`}
                        >
                          <FiMoreHorizontal size={14} />
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 z-10 min-w-[112px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenMessageId(null);
                                beginEditMessage(m);
                              }}
                              disabled={pendingMessageOps.has(m.id)}
                              className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenMessageId(null);
                                deleteTextMessage(m.id);
                              }}
                              disabled={pendingMessageOps.has(m.id)}
                              className="block w-full px-3 py-1.5 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-2 shadow-sm ${
                        isEditingThisMessage ? "w-[88%] sm:w-[420px]" : "max-w-[78%]"
                      } ${
                        isOwn
                          ? "bg-[#5D1C6A] text-white rounded-br-md dark:bg-[#5D1C6A] dark:text-[#FFF1D3]"
                          : "bg-white border border-gray-200 text-gray-900 rounded-bl-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      }`}
                    >
                      {renderMessage(m)}
                      {!isEditingThisMessage && (
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            isOwn
                              ? "text-[#FFF1D3]/70"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {formatTime(m.created_at)}
                          {m.edited_at && !m.deleted ? (
                            <span className="opacity-80">· edited</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>,
                );
              }
              return nodes;
            })()}
          </div>
        )}
      </div>
      {srOpen && (
        <div
          className={`shrink-0 border-t border-gray-200/70 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto overflow-x-hidden space-y-3 ${
            layout === "docked"
              ? "max-h-[200px] p-2"
              : "max-h-[55%] px-5 py-4"
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
                        ? "bg-[#5D1C6A] text-white"
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
                                ? "bg-[#5D1C6A] text-white"
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
                                  ? "bg-[#5D1C6A] text-white"
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
                              ? "bg-[#5D1C6A] text-white"
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
                    className="text-[10px] font-medium text-[#5D1C6A] dark:text-[#FFB090] hover:text-[#CA5995] dark:hover:text-[#CA5995] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
                          <span className="text-[#5D1C6A] dark:text-[#CA5995]">✓ Both available</span>
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
                          className="rounded-md bg-[#5D1C6A] hover:bg-[#CA5995] px-4 py-2 text-xs font-medium text-white transition-colors"
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
      <div
        className={`shrink-0 border-t border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 ${
          isModal ? "px-5 py-4" : "p-3"
        }`}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={`Message ${friendLabel.split(/[@\s]/)[0] || "friend"}…`}
            className={`flex-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-[#5D1C6A] focus:bg-white dark:focus:border-[#CA5995] dark:focus:bg-gray-900 transition-colors ${
              isModal ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-sm"
            }`}
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
            onClick={() => setSrOpen((v) => !v)}
            aria-label={srOpen ? "Close session request" : "Send session request"}
            title="Send session request"
            className={`inline-flex shrink-0 items-center justify-center rounded-full border transition-colors ${
              srOpen
                ? "border-[#5D1C6A] bg-[#FFF1D3] text-[#5D1C6A] dark:bg-[#5D1C6A]/40 dark:text-[#FFB090] dark:border-[#CA5995]"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-[#5D1C6A] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-[#FFB090]"
            } ${isModal ? "h-10 w-10" : "h-8 w-8"}`}
          >
            <FiCalendar size={isModal ? 16 : 14} />
          </button>
          <button
            onClick={sendText}
            disabled={isSending || !text.trim()}
            aria-label="Send message"
            className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#5D1C6A] text-white shadow-sm hover:bg-[#CA5995] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              isModal ? "h-10 w-10" : "h-8 w-8"
            }`}
          >
            <FiSend size={isModal ? 16 : 14} />
          </button>
        </div>
      </div>
    </>
  );

  if (layout === "docked") {
    return (
      <div
        className={`flex w-[320px] h-[380px] min-w-[300px] min-h-[320px] flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 animate-[slide-up_180ms_ease-out] ${
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="flex w-full max-w-lg h-[600px] max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-gray-200/70 dark:ring-gray-800 animate-[scale-in_180ms_ease-out]"
        style={{ transformOrigin: "center" }}
      >
        {header}
        {body}
      </div>
    </div>
  );
}
