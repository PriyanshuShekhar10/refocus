"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiMinus,
  FiMaximize2,
  FiX,
  FiMessageCircle,
  FiMoreHorizontal,
} from "react-icons/fi";
import { getAblyClient } from "@/lib/ably-client";
import { chatChannel } from "@/lib/realtimeChannels";
import { useEmailVerified } from "@/hooks/useEmailVerified";
import { useCurrentUserAvatar } from "@/hooks/useCurrentUserAvatar";
import ReportDialog from "@/app/(product)/components/ReportDialog";
import { AdminTag } from "@/components/admin-tag";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FriendChatInput from "./chat/FriendChatInput";
import {
  BOOKING_MINUTE_OPTIONS,
  DEFAULT_DURATION,
  isValidDuration,
  type DurationMin,
} from "@/constants/calendar";

type SessionRequestPayload = {
  sessionRequestId: string;
  start: string;
  durationMin: DurationMin;
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
  friendAvatarUrl?: string | null;
  friendIsAdmin?: boolean;
  onClose: () => void;
  layout?: "modal" | "docked" | "fullscreen";
  minimized?: boolean;
  onMinimizeToggle?: () => void;
  className?: string;
};

export default function FriendChat({
  friendId,
  friendLabel,
  friendAvatarUrl,
  friendIsAdmin = false,
  onClose,
  layout = "modal",
  minimized = false,
  onMinimizeToggle,
}: FriendChatProps) {
  const { data: session } = useSession();
  const currentUserAvatar = useCurrentUserAvatar();
  const { canInteract, message: verifyMessage } = useEmailVerified();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [srOpen, setSrOpen] = useState(false);
  const [srDate, setSrDate] = useState<Date | null>(null);
  const [srHour, setSrHour] = useState<number | null>(null);
  const [srMinute, setSrMinute] = useState<number>(0);
  const [srDuration, setSrDuration] = useState<DurationMin>(DEFAULT_DURATION);
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
  const [reportMessage, setReportMessage] = useState<ChatMessage | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/preferences");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const preferred = data?.preferences?.defaultSessionLength;
        if (!cancelled && typeof preferred === "number" && isValidDuration(preferred)) {
          setSrDuration(preferred);
        }
      } catch {
        // Keep DEFAULT_DURATION when preferences cannot be loaded.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    const today = new Date(currentTime);
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
  }, [currentTime]);

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
    const now = new Date(currentTime);
    const slotTime = new Date(date);
    slotTime.setHours(hour, 0, 0, 0);
    return slotTime <= now;
  }, [currentTime]);
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
  }, [friendId, scrollToBottom]);

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
            const withoutStaleOptimistic = prev.filter(
              (m) =>
                !(
                  m.id.startsWith("temp-") &&
                  m.from_user_id === incoming.from_user_id &&
                  m.content === incoming.content
                ),
            );
            if (withoutStaleOptimistic.some((m) => m.id === incoming.id)) {
              return withoutStaleOptimistic;
            }
            return [...withoutStaleOptimistic, incoming];
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

  const sendText = async (value: string) => {
    if (!value || !currentUserId || !canInteract) return;
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
    setError(null);
    try {
      const post = await fetch(`/api/chat/${friendId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", content: value }),
      });
      const data = await post.json();
      if (!post.ok) throw new Error(data.error || "Failed to send");
      setMessages((prev) => {
        const realMessageExists = prev.some(
          (m) =>
            m.id === data.id ||
            (m.id !== tempId &&
              m.content === value &&
              m.from_user_id === currentUserId),
        );
        if (realMessageExists) {
          return prev.filter((m) => m.id !== tempId);
        }
        return prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m));
      });
      shouldAutoScrollRef.current = true;
      requestAnimationFrame(() => scrollToBottom("smooth"));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError((e as Error).message);
      throw e;
    }
  };

  const sendSessionRequest = async () => {
    if (!canInteract) return;
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
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium text-rf-on-primary/70">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-rf-peach" />
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
                className="w-full resize-none rounded-xl bg-rf-on-primary/15 px-3 py-2 text-sm text-rf-on-primary placeholder:text-rf-on-primary/60 ring-1 ring-inset ring-rf-on-primary/15 focus:outline-none focus:ring-rf-on-primary/40 focus:bg-rf-on-primary/20 transition-colors"
                placeholder="Edit your message…"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-rf-on-primary/60 hidden sm:inline">
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
                    className="rounded-full px-3 py-1 text-[11px] font-medium text-rf-on-primary/80 hover:text-rf-on-primary hover:bg-rf-on-primary/10 disabled:opacity-60 transition-colors"
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
                    className="rounded-full bg-rf-on-primary px-3 py-1 text-[11px] font-semibold text-rf-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                ? "bg-rf-cream-bg text-rf-plum-ink border-rf-peach"
                : p?.status === "declined"
                  ? "bg-red-100 text-red-700 border-red-200"
                  : p?.status === "cancelled"
                    ? "bg-rf-line-soft text-rf-ink-soft border-rf-line"
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
              <div className="mt-1 text-xs text-rf-plum-ink bg-rf-cream-bg px-2 py-1 rounded">
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
                    className="rounded-md bg-rf-primary px-3 py-1 text-xs font-medium text-rf-on-primary hover:bg-rf-primary-hover"
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
                  className="rounded-md bg-rf-line px-3 py-1 text-xs font-medium text-rf-ink-soft hover:bg-rf-line"
                >
                  Delete request
                </button>
              )}
            </div>
          ) : (
            <div className="mt-2 text-xs text-rf-ink-mute capitalize">
              Status: {p?.status}
            </div>
          )}
        </div>
      );
    }
    return <div className="text-xs text-rf-ink-mute">Unsupported message</div>;
  };

  const isModal = layout === "modal";
  const friendInitial =
    friendLabel?.[0]?.toUpperCase?.() || "F";

  const renderMessageAvatar = (isOwn: boolean) => {
    const avatarSrc = isOwn ? currentUserAvatar : friendAvatarUrl;
    const initial = isOwn
      ? (session?.user?.name?.[0]?.toUpperCase() ?? "Y")
      : friendInitial;
    const sizeClass = isModal ? "h-7 w-7" : "h-6 w-6";
    const textClass = isModal ? "text-xs" : "text-[10px]";
    return (
      <Avatar className={`${sizeClass} shrink-0`}>
        {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
        <AvatarFallback
          className={`${textClass} font-semibold ${
            isOwn
              ? "bg-rf-primary text-rf-on-primary"
              : "bg-rf-cream-bg text-rf-plum-ink"
          }`}
        >
          {initial}
        </AvatarFallback>
      </Avatar>
    );
  };

  const header = (
    <div
      className={`flex items-center justify-between border-b border-rf-line/70 bg-rf-card/95 backdrop-blur-sm ${
        isModal ? "px-5 py-4" : "px-3 h-10"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          className={`shrink-0 ${isModal ? "h-10 w-10" : "h-6 w-6"}`}
        >
          {friendAvatarUrl ? (
            <AvatarImage src={friendAvatarUrl} alt={friendLabel} />
          ) : null}
          <AvatarFallback
            className={`font-semibold bg-rf-cream-bg text-rf-plum-ink ${
              isModal ? "text-sm" : "text-[10px]"
            }`}
          >
            {friendInitial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div
            className={`inline-flex max-w-full min-w-0 items-center gap-1.5 font-semibold text-rf-ink truncate ${
              isModal ? "text-base max-w-[260px]" : "text-sm max-w-[200px]"
            }`}
          >
            <span className="truncate">{friendLabel}</span>
            {friendIsAdmin ? <AdminTag size="xs" /> : null}
          </div>
          {isModal && (
            <div className="text-xs text-rf-ink-mute">
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
            className={`inline-flex items-center justify-center rounded-md text-rf-ink-mute hover:text-rf-ink hover:bg-rf-line-soft transition-colors ${
              isModal ? "h-8 w-8" : "h-6 w-6"
            }`}
          >
            {minimized ? <FiMaximize2 size={isModal ? 16 : 14} /> : <FiMinus size={isModal ? 16 : 14} />}
          </button>
        ) : null}
        <button
          onClick={onClose}
          aria-label="Close chat"
          className={`inline-flex items-center justify-center rounded-md text-rf-ink-mute hover:text-rf-ink hover:bg-rf-line-soft transition-colors ${
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
          <div className="flex flex-1 items-center justify-center text-xs text-rf-ink-mute">
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
            {friendAvatarUrl ? (
              <Avatar
                className={`${isModal ? "h-14 w-14 mb-4" : "h-10 w-10 mb-3"}`}
              >
                <AvatarImage src={friendAvatarUrl} alt={friendLabel} />
                <AvatarFallback
                  className={`font-semibold bg-rf-cream-bg text-rf-plum-ink ${
                    isModal ? "text-lg" : "text-sm"
                  }`}
                >
                  {friendInitial}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div
                className={`flex items-center justify-center rounded-full bg-rf-cream-bg ${
                  isModal ? "h-14 w-14 mb-4" : "h-10 w-10 mb-3"
                }`}
              >
                <FiMessageCircle
                  className={`text-rf-plum-ink ${
                    isModal ? "w-6 h-6" : "w-5 h-5"
                  }`}
                />
              </div>
            )}
            <p
              className={`font-semibold text-rf-ink ${
                isModal ? "text-base" : "text-sm"
              }`}
            >
              Say hi to {friendLabel.split(/[@\s]/)[0] || "your friend"}
            </p>
            <p
              className={`mt-1 max-w-[260px] text-rf-ink-mute ${
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
                      <span className="rounded-full bg-rf-line-soft px-3 py-0.5 text-[10px] font-medium uppercase tracking-wider text-rf-ink-mute">
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
                const canReport =
                  !isOwn && m.type === "text" && !m.deleted && !isEditingThisMessage;
                const showMessageMenu = canEditOrDelete || canReport;
                const isMenuOpen = menuOpenMessageId === m.id;
                nodes.push(
                  <div
                    key={m.id}
                    className={`group flex items-end gap-1.5 ${
                      isOwn ? "flex-row-reverse" : ""
                    }`}
                  >
                    {renderMessageAvatar(isOwn)}
                    {showMessageMenu && (
                      <div
                        className={`relative ${isOwn ? "order-first" : ""}`}
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
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-rf-ink-mute hover:bg-rf-line-soft hover:text-rf-ink transition-opacity opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 ${
                            isMenuOpen
                              ? "opacity-100"
                              : ""
                          }`}
                        >
                          <FiMoreHorizontal size={14} />
                        </button>
                        {isMenuOpen && (
                          <div
                            className={`absolute top-1/2 z-10 min-w-[112px] -translate-y-1/2 rounded-lg border border-rf-line bg-rf-card py-1 shadow-lg ${
                              isOwn ? "right-full mr-1" : "left-full ml-1"
                            }`}
                          >
                            {canEditOrDelete ? (
                              <>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenMessageId(null);
                                beginEditMessage(m);
                              }}
                              disabled={pendingMessageOps.has(m.id)}
                              className="block w-full px-3 py-1.5 text-left text-xs text-rf-ink-soft hover:bg-rf-line-soft disabled:opacity-60"
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
                              </>
                            ) : null}
                            {canReport ? (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenMessageId(null);
                                setReportMessage(m);
                              }}
                              className="block w-full px-3 py-1.5 text-left text-xs text-rf-ink-soft hover:bg-rf-line-soft"
                            >
                              Report
                            </button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-2 shadow-sm ${
                        isEditingThisMessage ? "w-[88%] sm:w-[420px]" : "max-w-[78%]"
                      } ${
                        isOwn
                          ? "bg-rf-primary text-rf-on-primary rounded-br-md"
                          : "bg-rf-bubble text-rf-ink rounded-bl-md"
                      }`}
                    >
                      {renderMessage(m)}
                      {!isEditingThisMessage && (
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            isOwn
                              ? "text-[#FFF1D3]/70"
                              : "text-rf-ink-mute"
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
          className={`shrink-0 border-t border-rf-line/70 bg-rf-bg overflow-y-auto overflow-x-hidden space-y-3 ${
            layout === "docked"
              ? "max-h-[200px] p-2"
              : "max-h-[55%] px-5 py-4"
          }`}
        >
            {/* Date Selection */}
            <div className={layout === "docked" ? "space-y-1" : ""}>
              <label className="text-[10px] font-medium text-rf-ink-mute uppercase tracking-wide mb-1.5 block">
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
                        ? "bg-rf-primary text-rf-on-primary"
                        : "bg-rf-card text-rf-ink-soft hover:bg-rf-line-soft border border-rf-line"
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
                  <label className="text-[10px] font-medium text-rf-ink-mute uppercase tracking-wide">
                    Pick a time
                  </label>
                  {loadingBusy && (
                    <span className="text-[10px] text-rf-ink-mute">Checking...</span>
                  )}
                </div>
                {/* Legend - hide in docked to save space */}
                {layout !== "docked" && (
                  <div className="flex gap-3 mb-2 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      <span className="text-rf-ink-mute">You&apos;re busy</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                      <span className="text-rf-ink-mute">Friend busy</span>
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
                            ? "bg-rf-line-soft text-rf-ink-mute cursor-not-allowed"
                            : conflict.hasConflict
                              ? conflict.isMine
                                ? "bg-red-100 dark:bg-red-900/30 text-red-400 dark:text-red-400 cursor-not-allowed border border-red-200 dark:border-red-800"
                                : "bg-orange-100 dark:bg-orange-900/30 text-orange-400 dark:text-orange-400 cursor-not-allowed border border-orange-200 dark:border-orange-800"
                              : srHour === slot.hour
                                ? "bg-rf-primary text-rf-on-primary"
                                : "bg-rf-card text-rf-ink-soft hover:bg-rf-line-soft border border-rf-line"
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
                    <span className={`text-rf-ink-mute ${layout === "docked" ? "text-[10px]" : "text-xs"}`}>Minutes:</span>
                    <div className="flex gap-1">
                      {BOOKING_MINUTE_OPTIONS.map((m) => {
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
                                  ? "bg-rf-primary text-rf-on-primary"
                                  : "bg-rf-card text-rf-ink-soft hover:bg-rf-line-soft border border-rf-line"
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
                <label className="text-[10px] font-medium text-rf-ink-mute uppercase tracking-wide mb-1.5 block">
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
                              ? "bg-rf-primary text-rf-on-primary"
                              : "bg-rf-card text-rf-ink-soft hover:bg-rf-line-soft border border-rf-line"
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
                  <label className="text-[10px] font-medium text-rf-ink-mute uppercase tracking-wide">
                    Session Goal
                  </label>
                  <button
                    type="button"
                    onClick={refineGoal}
                    disabled={isRefining || !srGoal.trim()}
                    className="text-[10px] font-medium text-rf-plum-ink hover:text-rf-plum-ink disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
                  className="w-full rounded-md border border-rf-line bg-rf-card text-rf-ink px-3 py-2 text-xs placeholder:text-rf-ink-mute min-h-[38px] resize-y"
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
                        maxLength={500}
                        className="w-full rounded-md border border-rf-line bg-rf-card text-rf-ink px-3 py-2 text-xs placeholder:text-rf-ink-mute"
                        value={srMessage}
                        onChange={(e) => setSrMessage(e.target.value)}
                      />
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-rf-ink-soft">
                          <span className="text-rf-plum-ink">✓ Both available</span>
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
                          className="rounded-md bg-rf-primary hover:bg-rf-primary-hover px-4 py-2 text-xs font-medium text-rf-on-primary transition-colors"
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
              className="w-full text-center text-xs text-rf-ink-mute hover:text-rf-ink py-1"
            >
              Cancel
            </button>
        </div>
      )}
      <FriendChatInput
        canInteract={canInteract}
        verifyMessage={verifyMessage ?? null}
        friendLabel={friendLabel}
        isModal={isModal}
        srOpen={srOpen}
        setSrOpen={setSrOpen}
        onSend={sendText}
      />
    </>
  );

  if (layout === "docked") {
    return (
      <>
      <div
        className={`flex w-[320px] h-[380px] min-w-[300px] min-h-[320px] flex-col overflow-hidden rounded-xl bg-rf-card shadow-2xl border border-rf-line animate-[slide-up_180ms_ease-out] ${
          minimized ? "h-10" : ""
        }`}
        style={{ transformOrigin: "bottom left" }}
      >
        {header}
        {minimized ? <div className="hidden" /> : body}
      </div>
      {reportMessage ? (
        <ReportDialog
          open
          onClose={() => setReportMessage(null)}
          targetType="friend_message"
          targetId={reportMessage.id}
          reportedUserId={reportMessage.from_user_id}
          reportedLabel={friendLabel}
          contentPreview={reportMessage.content ?? undefined}
        />
      ) : null}
      </>
    );
  }

  if (layout === "fullscreen") {
    return (
      <>
        <div className="flex h-full w-full flex-col overflow-hidden bg-rf-card">
          {header}
          {body}
        </div>
        {reportMessage ? (
          <ReportDialog
            open
            onClose={() => setReportMessage(null)}
            targetType="friend_message"
            targetId={reportMessage.id}
            reportedUserId={reportMessage.from_user_id}
            reportedLabel={friendLabel}
            contentPreview={reportMessage.content ?? undefined}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="flex w-full max-w-lg h-[600px] max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-rf-card shadow-2xl ring-1 ring-rf-line animate-[scale-in_180ms_ease-out]"
        style={{ transformOrigin: "center" }}
      >
        {header}
        {body}
      </div>
    </div>
    {reportMessage ? (
      <ReportDialog
        open
        onClose={() => setReportMessage(null)}
        targetType="friend_message"
        targetId={reportMessage.id}
        reportedUserId={reportMessage.from_user_id}
        reportedLabel={friendLabel}
        contentPreview={reportMessage.content ?? undefined}
      />
    ) : null}
    </>
  );
}
