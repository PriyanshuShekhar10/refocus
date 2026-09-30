"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { FiX } from "react-icons/fi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCommunityModeration } from "@/hooks/useCommunityModeration";
import {
  FIRST_SESSION_REQUIRED_CODE,
  FIRST_SESSION_REQUIRED_MESSAGE,
} from "@/lib/sessionAttendanceMessages";
import {
  BOOKING_MINUTE_OPTIONS,
  DEFAULT_DURATION,
  isValidDuration,
  type DurationMin,
} from "@/constants/calendar";

type BookSessionModalProps = {
  friendId: string;
  friendLabel: string;
  friendAvatarUrl?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function BookSessionModal({
  friendId,
  friendLabel,
  friendAvatarUrl,
  onClose,
  onSuccess,
}: BookSessionModalProps) {
  const { canBookSessions, bannedMessage } = useCommunityModeration();
  const [srDate, setSrDate] = useState<Date | null>(null);
  const [srHour, setSrHour] = useState<number | null>(null);
  const [srMinute, setSrMinute] = useState<number>(0);
  const [srDuration, setSrDuration] = useState<DurationMin>(DEFAULT_DURATION);
  const [srMessage, setSrMessage] = useState("");
  const [srGoal, setSrGoal] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
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
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 8);
    setLoadingBusy(true);
    fetch(
      `/api/sessions/busy?from=${from.toISOString()}&to=${to.toISOString()}&friendId=${friendId}`
    )
      .then((res) => (res.ok ? res.json() : { myBusySlots: [], friendBusySlots: [] }))
      .then((data) => setBusySlots(data))
      .catch(() => setBusySlots({ myBusySlots: [], friendBusySlots: [] }))
      .finally(() => setLoadingBusy(false));
  }, [friendId]);

  const getSlotConflict = useCallback(
    (
      date: Date | null,
      hour: number,
      minute: number,
      durationMin: number
    ): { hasConflict: boolean; isMine: boolean; isFriend: boolean } => {
      if (!date) return { hasConflict: false, isMine: false, isFriend: false };
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000);
      const slotStartMs = slotStart.getTime();
      const slotEndMs = slotEnd.getTime();
      let isMine = false;
      let isFriend = false;
      for (const slot of busySlots.myBusySlots) {
        const busyStart = new Date(slot.start).getTime();
        const busyEnd = new Date(slot.end).getTime();
        if (slotStartMs < busyEnd && slotEndMs > busyStart) {
          isMine = true;
          break;
        }
      }
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

  const isTimeSlotPast = useCallback((date: Date | null, hour: number) => {
    if (!date) return false;
    const now = new Date();
    const slotTime = new Date(date);
    slotTime.setHours(hour, 0, 0, 0);
    return slotTime <= now;
  }, []);

  const dateOptions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const options: { label: string; date: Date }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const label =
        i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${dayNames[d.getDay()]} ${d.getDate()}`;
      options.push({ label, date: d });
    }
    return options;
  }, []);

  const timeSlots = useMemo(() => {
    const slots: { hour: number; label: string }[] = [];
    for (let h = 0; h <= 23; h++) {
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      slots.push({ hour: h, label: `${hour12} ${ampm}` });
    }
    return slots;
  }, []);

  const sendRequest = async () => {
    setError(null);
    if (!canBookSessions) {
      setError(bannedMessage);
      return;
    }
    if (!srDate || srHour === null) {
      setError("Pick date & time");
      return;
    }
    const startTime = new Date(srDate);
    startTime.setHours(srHour, srMinute, 0, 0);
    if (startTime <= new Date()) {
      setError("Cannot schedule in the past");
      return;
    }
    if (getSlotConflict(srDate, srHour, srMinute, srDuration).hasConflict) {
      setError("Choose a slot when both of you are free");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/chat/${friendId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "session-request",
          start: startTime.toISOString(),
          durationMin: srDuration,
          message: srMessage || undefined,
          goal: srGoal || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.code === FIRST_SESSION_REQUIRED_CODE
            ? FIRST_SESSION_REQUIRED_MESSAGE
            : data.error || "Failed to send request",
        );
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const finalConflict =
    srDate && srHour !== null
      ? getSlotConflict(srDate, srHour, srMinute, srDuration)
      : null;
  const canSend =
    canBookSessions &&
    srDate &&
    srHour !== null &&
    !finalConflict?.hasConflict &&
    (() => {
      const t = new Date(srDate);
      t.setHours(srHour, srMinute, 0, 0);
      return t > new Date();
    })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl bg-rf-card shadow-xl border border-rf-line overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-rf-line">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              {friendAvatarUrl ? (
                <AvatarImage src={friendAvatarUrl} alt={friendLabel} />
              ) : null}
              <AvatarFallback className="text-sm font-semibold bg-rf-cream-bg text-rf-plum-ink">
                {friendLabel?.[0]?.toUpperCase?.() || "F"}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold text-rf-ink truncate">
              Book session with {friendLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-rf-ink-mute hover:text-rf-ink hover:bg-rf-line-soft transition-colors"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-rf-ink-mute">
            Pick a time when both of you are free. They&apos;ll get a request in chat.
          </p>

          {/* Date */}
          <div>
            <label className="text-[10px] font-medium text-rf-ink-mute uppercase tracking-wide mb-1.5 block">
              Pick a day
            </label>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {dateOptions.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSrDate(opt.date);
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

          {/* Time */}
          {srDate && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-medium text-rf-ink-mute uppercase tracking-wide">
                  Pick a time
                </label>
                {loadingBusy && (
                  <span className="text-[10px] text-rf-ink-mute">Checking availability…</span>
                )}
              </div>
              <div className="flex gap-3 mb-2 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-rf-ink-mute">You&apos;re busy</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-rf-ink-mute">Friend busy</span>
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {timeSlots.map((slot) => {
                  const isPast = isTimeSlotPast(srDate, slot.hour);
                  const conflict = getSlotConflict(srDate, slot.hour, 0, srDuration);
                  const isDisabled = isPast || conflict.hasConflict;
                  return (
                    <button
                      key={slot.hour}
                      type="button"
                      onClick={() => !isDisabled && setSrHour(slot.hour)}
                      disabled={isDisabled}
                      title={
                        conflict.isMine && conflict.isFriend
                          ? "Both busy"
                          : conflict.isMine
                            ? "You have a session"
                            : conflict.isFriend
                              ? "Friend has a session"
                              : undefined
                      }
                      className={`rounded px-1.5 py-1.5 text-[11px] font-medium transition-colors ${
                        isPast
                          ? "bg-rf-line-soft text-rf-ink-mute cursor-not-allowed"
                          : conflict.hasConflict
                            ? conflict.isMine
                              ? "bg-red-100 dark:bg-red-900/30 text-red-400 cursor-not-allowed border border-red-200 dark:border-red-800"
                              : "bg-orange-100 dark:bg-orange-900/30 text-orange-400 cursor-not-allowed border border-orange-200 dark:border-orange-800"
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
              {srHour !== null && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-rf-ink-mute">Minutes:</span>
                  <div className="flex gap-1">
                    {BOOKING_MINUTE_OPTIONS.map((m) => {
                      const mc = getSlotConflict(srDate, srHour, m, srDuration);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => !mc.hasConflict && setSrMinute(m)}
                          disabled={mc.hasConflict}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                            mc.hasConflict
                              ? mc.isMine
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

          {/* Duration */}
          {srDate && srHour !== null && (
            <div>
              <label className="text-[10px] font-medium text-rf-ink-mute uppercase tracking-wide mb-1.5 block">
                Duration
              </label>
              <div className="flex gap-1">
                {([25, 50, 75] as const).map((d) => {
                  const dc = getSlotConflict(srDate, srHour, srMinute, d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => !dc.hasConflict && setSrDuration(d)}
                      disabled={dc.hasConflict}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        dc.hasConflict
                          ? dc.isMine
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

          {srDate && srHour !== null && (
            <div>
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
                className="w-full rounded-md border border-rf-line bg-rf-card text-rf-ink px-3 py-2 text-sm placeholder:text-rf-ink-mute min-h-[38px] resize-y"
                value={srGoal}
                onChange={(e) => setSrGoal(e.target.value)}
              />
            </div>
          )}

          {/* Message & summary */}
          {srDate && srHour !== null && (
            <div className="space-y-2">
              {finalConflict?.hasConflict ? (
                <div
                  className={`p-2 rounded-md text-xs ${
                    finalConflict.isMine
                      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                  }`}
                >
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
                    className="w-full rounded-md border border-rf-line bg-rf-card text-rf-ink px-3 py-2 text-sm placeholder:text-rf-ink-mute"
                    value={srMessage}
                    onChange={(e) => setSrMessage(e.target.value)}
                  />
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
                </>
              )}
              {error && (
                <div className="rounded-md bg-red-100 dark:bg-red-900/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-rf-line flex justify-end gap-3 bg-rf-bg/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-rf-line bg-rf-card px-4 py-2 text-sm font-medium text-rf-ink-soft hover:bg-rf-line-soft transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={sendRequest}
            disabled={!canSend || sending}
            className="rounded-lg bg-rf-primary px-4 py-2 text-sm font-medium text-rf-on-primary hover:bg-rf-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? "Sending…" : "Send session request"}
          </button>
        </div>
      </div>
    </div>
  );
}
