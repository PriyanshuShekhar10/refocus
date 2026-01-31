"use client";
import { useState, useMemo, useEffect, useCallback } from "react";

export type CreatedSession = {
  id: string;
  start: string;
  end: string;
  durationMin: 25 | 50 | 75;
  sessionType: "focus" | "deep-work" | "learning";
  status: "available" | "booked" | "in-progress" | "completed";
};

type Props = {
  label?: string;
  className?: string;
  defaultDuration?: 25 | 50 | 75;
  defaultSessionType?: "focus" | "deep-work" | "learning";
  onCreated?: (session: CreatedSession) => void;
};

export default function BookSessionButton({
  label = "Book a session",
  className = "",
  defaultDuration = 25,
  defaultSessionType = "focus",
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [srDate, setSrDate] = useState<Date | null>(null);
  const [srHour, setSrHour] = useState<number | null>(null);
  const [srMinute, setSrMinute] = useState<number>(0);
  const [duration, setDuration] = useState<25 | 50 | 75>(defaultDuration);
  const [sessionType, setSessionType] = useState<
    "focus" | "deep-work" | "learning"
  >(defaultSessionType);
  const [quietOwner, setQuietOwner] = useState(false);

  const [myBusySlots, setMyBusySlots] = useState<
    Array<{ start: string; end: string }>
  >([]);
  const [loadingBusy, setLoadingBusy] = useState(false);

  // Fetch my busy slots when modal opens
  useEffect(() => {
    if (!open) return;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 8);
    setLoadingBusy(true);
    fetch(
      `/api/sessions/busy?from=${from.toISOString()}&to=${to.toISOString()}`
    )
      .then((res) => (res.ok ? res.json() : { myBusySlots: [] }))
      .then((data) => setMyBusySlots(data.myBusySlots ?? []))
      .catch(() => setMyBusySlots([]))
      .finally(() => setLoadingBusy(false));
  }, [open]);

  const getSlotConflict = useCallback(
    (
      date: Date | null,
      hour: number,
      minute: number,
      durationMin: number
    ): boolean => {
      if (!date) return false;
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      const slotEnd = new Date(
        slotStart.getTime() + durationMin * 60_000
      );
      const slotStartMs = slotStart.getTime();
      const slotEndMs = slotEnd.getTime();
      for (const slot of myBusySlots) {
        const busyStart = new Date(slot.start).getTime();
        const busyEnd = new Date(slot.end).getTime();
        if (slotStartMs < busyEnd && slotEndMs > busyStart) return true;
      }
      return false;
    },
    [myBusySlots]
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

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);
    if (!srDate || srHour === null) {
      setError("Pick date & time.");
      return;
    }
    const startTime = new Date(srDate);
    startTime.setHours(srHour, srMinute, 0, 0);
    if (startTime <= new Date()) {
      setError("Cannot create a session in the past.");
      return;
    }
    if (getSlotConflict(srDate, srHour, srMinute, duration)) {
      setError("You already have a session during this time.");
      return;
    }
    const isoStart = startTime.toISOString();
    const durationMin = duration;
    const isoEnd = new Date(
      startTime.getTime() + durationMin * 60_000
    ).toISOString();

    setBusy(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: isoStart,
          durationMin,
          sessionType,
          quietOwner,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create session");

      onCreated?.({
        id: data?.id ?? "",
        start: isoStart,
        end: isoEnd,
        durationMin,
        sessionType,
        status: "available",
      });

      setSuccess("Session created!");
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
        setSrDate(null);
        setSrHour(null);
        setSrMinute(0);
      }, 700);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const hasConflict =
    srDate &&
    srHour !== null &&
    getSlotConflict(srDate, srHour, srMinute, duration);

  return (
    <>
      <button
        data-book-session-trigger
        className={`w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 ${className}`}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-lg bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Book a session
              </h2>
              <button
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Quick date selection (same as friends chat) */}
              <div>
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Pick a day
                </label>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {dateOptions.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSrDate(opt.date);
                        if (
                          srHour !== null &&
                          isTimeSlotPast(opt.date, srHour)
                        ) {
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

              {/* Time selection with conflict highlighting */}
              {srDate && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Pick a time
                    </label>
                    {loadingBusy && (
                      <span className="text-[10px] text-gray-400">
                        Checking availability…
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mb-2 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-gray-500 dark:text-gray-400">
                        You&apos;re busy
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {timeSlots.map((slot) => {
                      const isPastSlot = isTimeSlotPast(srDate, slot.hour);
                      const conflict = getSlotConflict(
                        srDate,
                        slot.hour,
                        0,
                        duration
                      );
                      const isDisabled = isPastSlot || conflict;
                      return (
                        <button
                          key={slot.hour}
                          type="button"
                          onClick={() =>
                            !isDisabled && setSrHour(slot.hour)
                          }
                          disabled={isDisabled}
                          title={
                            conflict
                              ? "You have a session during this time"
                              : undefined
                          }
                          className={`rounded px-1.5 py-1.5 text-[11px] font-medium transition-colors ${
                            isPastSlot
                              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                              : conflict
                                ? "bg-red-100 dark:bg-red-900/30 text-red-400 dark:text-red-400 cursor-not-allowed border border-red-200 dark:border-red-800"
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
                  {srHour !== null && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Minutes:
                      </span>
                      <div className="flex gap-1">
                        {([0, 15, 30, 45] as const).map((m) => {
                          const minuteConflict = getSlotConflict(
                            srDate,
                            srHour,
                            m,
                            duration
                          );
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() =>
                                !minuteConflict && setSrMinute(m)
                              }
                              disabled={minuteConflict}
                              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                                minuteConflict
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-400 cursor-not-allowed"
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

              {/* Duration */}
              {srDate && srHour !== null && (
                <div>
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                    Duration
                  </label>
                  <div className="flex gap-1">
                    {([25, 50, 75] as const).map((d) => {
                      const durationConflict = getSlotConflict(
                        srDate,
                        srHour,
                        srMinute,
                        d
                      );
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            !durationConflict && setDuration(d)
                          }
                          disabled={durationConflict}
                          title={
                            durationConflict
                              ? `${d} min would overlap with your session`
                              : undefined
                          }
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            durationConflict
                              ? "bg-red-100 dark:bg-red-900/30 text-red-400 cursor-not-allowed border border-red-200 dark:border-red-800"
                              : duration === d
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

              {/* Session type */}
              {srDate && srHour !== null && (
                <div>
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                    Session type
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(["focus", "deep-work", "learning"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSessionType(t)}
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize ${
                          sessionType === t
                            ? "border-green-600 bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        }`}
                        disabled={busy}
                      >
                        {t.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quiet mode */}
              {srDate && srHour !== null && (
                <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-gray-700 dark:accent-gray-300"
                    checked={quietOwner}
                    onChange={(e) => setQuietOwner(e.target.checked)}
                    disabled={busy}
                  />
                  Quiet session (start muted for you)
                </label>
              )}

              {/* Availability summary & messages */}
              {srDate && srHour !== null && (
                <div className="space-y-2">
                  {hasConflict ? (
                    <div className="rounded-md bg-red-100 dark:bg-red-900/30 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                      ⚠️ You already have a session during this time
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      <span className="text-green-600 dark:text-green-400">
                        ✓ Available
                      </span>
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
                      · {duration} min
                    </div>
                  )}
                  {error && (
                    <div className="rounded-md bg-red-100 dark:bg-red-900/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="rounded-md bg-green-100 dark:bg-green-900/40 px-3 py-2 text-sm text-green-700 dark:text-green-300">
                      {success}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-indigo-600 dark:bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCreate}
                disabled={
                  busy ||
                  !srDate ||
                  srHour === null ||
                  !!hasConflict ||
                  (srDate &&
                    srHour !== null &&
                    (() => {
                      const t = new Date(srDate);
                      t.setHours(srHour, srMinute, 0, 0);
                      return t <= new Date();
                    })())
                }
              >
                {busy
                  ? "Creating…"
                  : hasConflict
                    ? "Slot unavailable"
                    : "Create session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
