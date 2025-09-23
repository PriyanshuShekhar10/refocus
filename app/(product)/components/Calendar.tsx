"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
// Realtime removed during migration from Supabase

/* =========================
    Types
========================= */

// ENHANCED: Event type now includes booking-specific details
export type CalendarEvent = {
  id: string;
  title?: string;
  start: string; // ISO
  end: string; // ISO
  durationMin: 25 | 50 | 75;
  sessionType: "focus" | "deep-work" | "learning";
  name?: string | null;
  color?: string | null;
  // Simplified partner model for the frontend (kept for UI text)
  partner?: { id: string; name: string; avatarUrl?: string } | null | "anyone";
  // Status to manage the booking flow
  status: "available" | "booked" | "in-progress" | "completed";
  owner_id?: string;
  owner?: {
    id: string;
    email?: string;
    firstname?: string;
    lastname?: string;
  } | null;
  participants?: {
    user_id: string;
    joined_at: string;
    email?: string;
    firstname?: string;
    lastname?: string;
  }[];
};

// Shape of sessions returned from /api/sessions endpoint
type FetchedSession = {
  id: string;
  start: string;
  end: string;
  durationMin: 25 | 50 | 75;
  sessionType: "focus" | "deep-work" | "learning";
  status: "available" | "booked" | "in-progress" | "completed";
  name?: string | null;
  color?: string | null;
  owner_id?: string;
  owner?: {
    id: string;
    email?: string;
    firstname?: string;
    lastname?: string;
  } | null;
  participants?: Array<{
    user_id: string;
    joined_at: string;
    email?: string;
    firstname?: string;
    lastname?: string;
  }>;
};

export type PresenceDot = {
  id: string;
  time: string; // ISO
  columnDate: string; // YYYY-MM-DD
  avatarUrl: string;
  name?: string;
};

export type CalendarProps = {
  startHour?: number;
  endHour?: number;
  stepMinutes?: 15 | 30;
  visibleDays?: number;
  startDate?: Date;
  events?: CalendarEvent[];
  presence?: PresenceDot[];
  locale?: string;
  onEventsChange?: (next: CalendarEvent[]) => void;
  className?: string;
};

/* =========================
    Small time helpers
========================= */
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => new Date(d).toISOString();
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const formatDayLabel = (d: Date, locale = "en-US") =>
  d.toLocaleDateString(locale, { weekday: "short", day: "numeric" });
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clamp = (val: number, min: number, max: number) =>
  Math.min(max, Math.max(min, val));
const minutesBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 60000);
// const snapMinutes = (m: number, step: number) => Math.round(m / step) * step;

/* =========================
    Calendar Component
========================= */
export default function Calendar({
  startHour = 7,
  endHour = 22,
  stepMinutes = 15,
  visibleDays = 3,
  startDate: startDateProp,
  events: eventsProp,
  // presence,
  locale = "en-US",
  onEventsChange,
  className = "",
}: CalendarProps) {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(() =>
    startDateProp ? new Date(startDateProp) : startOfDay(today)
  );
  useEffect(() => {
    if (startDateProp) setStartDate(startOfDay(new Date(startDateProp)));
  }, [startDateProp]);

  const days = useMemo(
    () => new Array(visibleDays).fill(0).map((_, i) => addDays(startDate, i)),
    [visibleDays, startDate]
  );

  const totalMinutes = (endHour - startHour) * 60;

  const [internalEvents, setInternalEvents] = useState<CalendarEvent[]>(
    () => eventsProp ?? []
  );
  const events = eventsProp ?? internalEvents;

  const setEvents = useCallback(
    (next: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => {
      if (onEventsChange) {
        // To support functional updates, we need to resolve the next state first
        if (typeof next === "function") {
          onEventsChange(next(events));
        } else {
          onEventsChange(next);
        }
      }
      if (!eventsProp) {
        setInternalEvents(next);
      }
    },
    [onEventsChange, eventsProp, events]
  );

  // --- NEW: State for filters and booking modal ---
  const [durationFilter, setDurationFilter] = useState<number[]>([25, 50, 75]);
  const [bookingModalEvent, setBookingModalEvent] =
    useState<CalendarEvent | null>(null);
  const [detailsModalEvent, setDetailsModalEvent] =
    useState<CalendarEvent | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [createDuration, setCreateDuration] = useState<25 | 50 | 75>(25);
  const [toast, setToast] = useState<string | null>(null);

  const handleDurationFilterChange = (duration: number) => {
    setDurationFilter((prev) =>
      prev.includes(duration)
        ? prev.filter((d) => d !== duration)
        : [...prev, duration]
    );
  };

  const handleBookSlot = (event: CalendarEvent) => {
    setBookingModalEvent(event);
  };

  const handleConfirmBooking = async () => {
    if (!bookingModalEvent) return;
    const id = bookingModalEvent.id;
    // Optimistic update
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "booked" } : e))
    );
    setBookingModalEvent(null);
    try {
      const res = await fetch(`/api/sessions/${id}/join`, { method: "POST" });
      if (!res.ok)
        throw new Error((await res.json()).error || "Failed to join");
    } catch (e) {
      // revert
      setEvents((prev) =>
        prev.map((ev) => (ev.id === id ? { ...ev, status: "available" } : ev))
      );
      alert((e as Error).message);
    }
  };

  // Update session fields (name/color) then update local state
  const handleUpdateSessionMeta = async (
    id: string,
    patch: { name?: string | null; color?: string | null }
  ) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok)
        throw new Error((await res.json()).error || "Failed to update");
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
      setToast("Session updated");
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const rowPx = 28;
  const minuteToPx = (m: number) => (m / stepMinutes) * rowPx;

  const goToday = () => setStartDate(startOfDay(new Date()));
  const shiftRange = (deltaDays: number) =>
    setStartDate((d) => addDays(d, deltaDays));

  // --- UPDATED: Memoized events now filter based on duration ---
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const d of days) map[ymd(d)] = [];

    const filteredEvents = events.filter((ev) =>
      durationFilter.includes(ev.durationMin)
    );

    for (const ev of filteredEvents) {
      const s = new Date(ev.start);
      const key = ymd(s);
      if (map[key]) map[key].push(ev);
    }
    for (const k in map)
      map[k].sort((a, b) => +new Date(a.start) - +new Date(b.start));
    return map;
  }, [days, events, durationFilter]);

  const nowLine = (() => {
    const day0 = days[0];
    const dayLast = days[days.length - 1];
    if (!day0 || !dayLast) return null;
    const n = now;
    if (n < startOfDay(day0) || n > addDays(startOfDay(dayLast), 1))
      return null;
    const m = n.getHours() * 60 + n.getMinutes() - startHour * 60;
    const y = clamp(minuteToPx(m), 0, minuteToPx(totalMinutes));
    return y;
  })();

  // Realtime: notify owner when someone joins their session
  // Realtime notifications removed; consider WebSockets or Pusher here

  // Fetch sessions for visible range
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const from = toISO(days[0]);
      const to = toISO(addDays(days[days.length - 1], 1));
      try {
        const res = await fetch(
          `/api/sessions?from=${encodeURIComponent(
            from
          )}&to=${encodeURIComponent(to)}`
        );
        let data: any = null;
        try {
          data = await res.json();
        } catch {}
        if (!res.ok) {
          console.error("/api/sessions failed", data?.error || res.statusText);
          setToast("Could not load sessions");
          setTimeout(() => setToast(null), 3000);
          return;
        }
        if (cancelled) return;
        setCurrentUserId(data.currentUserId ?? null);
        const mapped: CalendarEvent[] = (data.sessions ?? []).map(
          (s: FetchedSession) => ({
            id: s.id,
            start: s.start,
            end: s.end,
            durationMin: s.durationMin,
            sessionType: s.sessionType,
            status: s.status,
            name: s.name ?? null,
            color: s.color ?? null,
            owner_id: s.owner_id,
            owner: s.owner,
            participants: s.participants,
          })
        );
        setInternalEvents(mapped);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [startDate, visibleDays, days]);

  const createSession = async (start: Date, durationMin: 25 | 50 | 75) => {
    const tempId = `temp_${Date.now()}`;
    const end = addMinutes(start, durationMin);
    const optimistic: CalendarEvent = {
      id: tempId,
      start: toISO(start),
      end: toISO(end),
      durationMin,
      sessionType: "focus",
      status: "available",
      owner_id: currentUserId ?? undefined,
      participants: currentUserId
        ? [{ user_id: currentUserId, joined_at: new Date().toISOString() }]
        : [],
    };
    setEvents((prev) => [...prev, optimistic]);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: optimistic.start,
          durationMin,
          sessionType: optimistic.sessionType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setEvents((prev) =>
        prev.map((e) => (e.id === tempId ? { ...e, id: data.id } : e))
      );
    } catch (e) {
      setEvents((prev) => prev.filter((e) => e.id !== tempId));
      alert((e as Error).message);
    }
  };

  const deleteSession = async (id: string) => {
    const existing = events.find((e) => e.id === id);
    if (!existing) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok)
        throw new Error((await res.json()).error || "Failed to delete");
    } catch (e) {
      // revert
      setEvents((prev) => [...prev, existing]);
      alert((e as Error).message);
    }
  };

  // Clicking empty space to create your own session
  const handleGridClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const gutter = 64; // w-16 time gutter
    const contentWidth = Math.max(0, rect.width - gutter);
    const xAdjusted = Math.max(0, x - gutter);
    // Determine which day column was clicked (inside content area only)
    const dayWidth = contentWidth / visibleDays;
    const dayIndex = clamp(
      Math.floor(xAdjusted / dayWidth),
      0,
      visibleDays - 1
    );
    const dayDate = days[dayIndex];
    // Y to minutes
    const y = e.clientY - rect.top;
    const minutesFromTop = Math.round(y / rowPx) * stepMinutes;
    const minutesOfDay = clamp(
      minutesFromTop + startHour * 60,
      startHour * 60,
      endHour * 60 - 25
    );
    const start = new Date(startOfDay(dayDate));
    start.setMinutes(minutesOfDay);
    // use selected creation duration
    const preferred = createDuration;
    // prevent overlap with existing events on the same day
    const dayKey = ymd(dayDate);
    const overlaps = (eventsByDay[dayKey] ?? []).some((ev) => {
      const s = new Date(ev.start);
      const eEnd = new Date(ev.end);
      const newEnd = addMinutes(start, preferred);
      return new Date(start) < eEnd && newEnd > s;
    });
    if (overlaps) {
      setToast("Slot unavailable");
      setTimeout(() => setToast(null), 2000);
      return;
    }
    createSession(start, preferred);
  };

  return (
    <div className={`flex h-[calc(100vh-2rem)] w-full gap-4 ${className}`}>
      {/* --- REPURPOSED: Left panel is now for filters and timezone --- */}
      <aside className="w-72 shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Book a Session</h3>

        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700">Timezone</label>
          {/* TODO: Integrate a real timezone picker library here */}
          <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            <option>Asia/Kolkata (Auto)</option>
            <option>America/New_York</option>
            <option>Europe/London</option>
          </select>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700">Filters</h4>
          <div className="mt-3">
            <p className="text-xs text-gray-500">Duration (minutes)</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[25, 50, 75].map((m) => (
                <button
                  key={m}
                  onClick={() => handleDurationFilterChange(m)}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    durationFilter.includes(m)
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {/* TODO: Add more filters for session type, partner, etc. here */}
          <div className="mt-4">
            <p className="text-xs text-gray-500">New session length</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[25, 50, 75].map((m) => (
                <button
                  key={`create-${m}`}
                  onClick={() => setCreateDuration(m as 25 | 50 | 75)}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    createDuration === m
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Tip: click an empty slot to create your own session.
            </p>
          </div>
        </div>
      </aside>

      {/* Right: Calendar Area */}
      <section className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftRange(-1)}
              className="rounded-md border p-2"
            >
              ◀︎
            </button>
            <button
              onClick={goToday}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Today
            </button>
            <button
              onClick={() => shiftRange(1)}
              className="rounded-md border p-2"
            >
              ▶︎
            </button>
            <span className="ml-4 text-lg font-semibold">
              {formatDayLabel(startDate, locale)}
            </span>
          </div>
          {/* TODO: Add layout toggle (List/Grid) and search bar here */}
        </div>

        <div
          ref={gridRef}
          className="relative flex h-[calc(100%-3.75rem)] overflow-auto"
          onClick={handleGridClick}
        >
          {/* Time Gutter */}
          <div className="w-16 shrink-0 border-r bg-gray-50/80 pt-12">
            {Array.from({ length: endHour - startHour }).map((_, i) => (
              <div key={i} className="relative h-[112px] text-right">
                <span className="absolute -top-2 right-2 text-xs text-gray-400">
                  {formatHour(startHour + i)}
                </span>
              </div>
            ))}
          </div>

          {/* Columns */}
          <div
            className="grid flex-1"
            style={{ gridTemplateColumns: `repeat(${visibleDays}, 1fr)` }}
          >
            {days.map((d) => (
              <div key={ymd(d)} className="relative border-r">
                {/* Horizontal Lines */}
                {Array.from({ length: endHour - startHour }).map((_, i) => (
                  <div key={i} className="h-[112px] border-t border-gray-100" />
                ))}
                {/* Now Line */}
                {nowLine !== null && ymd(now) === ymd(d) && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10"
                    style={{ top: nowLine }}
                  >
                    <div className="h-0.5 w-full bg-red-500" />
                    <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
                  </div>
                )}

                {/* Events */}
                <div className="absolute inset-0">
                  {(eventsByDay[ymd(d)] ?? []).map((ev) => {
                    const s = new Date(ev.start);
                    const top = minuteToPx(
                      minutesBetween(startOfDay(s), s) - startHour * 60
                    );
                    const height = minuteToPx(ev.durationMin);
                    const isBooked = ev.status === "booked";
                    const isOwner =
                      ev.owner_id &&
                      currentUserId &&
                      ev.owner_id === currentUserId;

                    // Determine tooltip for owner on booked sessions: show other participant's name/email
                    const tooltip = (() => {
                      if (!(isOwner && isBooked)) return null;
                      const others = (ev.participants || []).filter(
                        (p) => p.user_id !== currentUserId
                      );
                      const other = others[0];
                      if (!other) return null;
                      const name = [other.firstname, other.lastname]
                        .filter(Boolean)
                        .join(" ");
                      const label = name || other.email || other.user_id;
                      const email = other.email;
                      return { label, email };
                    })();

                    return (
                      <div
                        key={ev.id}
                        className="absolute inset-x-2 z-20"
                        style={{ top }}
                      >
                        <div
                          style={{
                            height,
                            backgroundColor:
                              ev.color || (isBooked ? "#e5e7eb" : "#eef2ff"),
                          }}
                          className={`rounded-lg p-2 flex flex-col justify-between ${
                            isBooked
                              ? "border border-gray-300"
                              : "border border-indigo-200 hover:border-indigo-400 cursor-pointer"
                          }`}
                          title={
                            tooltip
                              ? `${tooltip.label}${
                                  tooltip.email ? `\n${tooltip.email}` : ""
                                }`
                              : undefined
                          }
                          onClick={(evt) => {
                            evt.stopPropagation();
                            if (!isBooked && !isOwner) handleBookSlot(ev);
                            else setDetailsModalEvent(ev);
                          }}
                        >
                          <div>
                            <p className="font-semibold text-sm text-gray-800">
                              {s.toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })}
                            </p>
                            <p className="text-xs text-gray-600">
                              {ev.durationMin} min • {ev.sessionType}
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-indigo-700 font-medium">
                              {isOwner
                                ? ev.name
                                  ? ev.name
                                  : "Your session"
                                : isBooked
                                ? "Booked"
                                : "Partner needed"}
                            </span>
                            {isOwner ? (
                              <button
                                className="text-xs font-semibold text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSession(ev.id);
                                }}
                              >
                                Delete
                              </button>
                            ) : !isBooked ? (
                              <button
                                className="text-xs font-semibold text-indigo-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBookSlot(ev);
                                }}
                              >
                                Book
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-gray-600">
                                Booked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- NEW: Booking Modal --- */}
      {bookingModalEvent && (
        <BookingModal
          event={bookingModalEvent}
          onClose={() => setBookingModalEvent(null)}
          onConfirm={handleConfirmBooking}
        />
      )}
      {/* --- NEW: Details Modal (scaffold) --- */}
      {detailsModalEvent && (
        <SessionDetailsModal
          event={detailsModalEvent}
          onClose={() => setDetailsModalEvent(null)}
          currentUserId={currentUserId}
          onUpdate={(patch) =>
            detailsModalEvent &&
            handleUpdateSessionMeta(detailsModalEvent.id, patch)
          }
        />
      )}
      {toast && <Toast message={toast} />}
    </div>
  );
}

// Simple toast notification
function Toast({ message }: { message: string }) {
  return (
    <div className="fixed right-4 top-4 z-[100] rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
      {message}
    </div>
  );
}

// --- NEW: Booking Modal Component ---
function BookingModal({
  event,
  onClose,
  onConfirm,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold">Confirm Booking</h2>
        <p className="mt-2 text-gray-600">
          You are booking a{" "}
          <strong>
            {event.durationMin}-minute {event.sessionType}
          </strong>{" "}
          session for:
        </p>
        <div className="mt-4 rounded-md bg-gray-100 p-3 text-center font-medium">
          {new Date(event.start).toLocaleString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        {/* TODO: Add other booking options like partner selection, goal text box */}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function formatHour(h24: number) {
  const h = ((h24 + 11) % 12) + 1;
  const suffix = h24 < 12 ? "AM" : "PM";
  return `${h} ${suffix}`;
}

// --- NEW: Session Details Modal (basic scaffold) ---
function SessionDetailsModal({
  event,
  onClose,
  currentUserId,
  onUpdate,
}: {
  event: CalendarEvent;
  onClose: () => void;
  currentUserId: string | null;
  onUpdate: (patch: { name?: string | null; color?: string | null }) => void;
}) {
  const participants = event.participants || [];
  const other = participants.find((p) => p.user_id !== currentUserId);
  const otherName = other
    ? [other.firstname, other.lastname].filter(Boolean).join(" ") ||
      other.email ||
      other.user_id
    : undefined;
  const isOwner =
    event.owner_id && currentUserId && event.owner_id === currentUserId;
  const [name, setName] = React.useState<string>(event.name || "");
  const [color, setColor] = React.useState<string>(event.color || "");
  const [saving, setSaving] = React.useState<boolean>(false);
  const [friendReqStatus, setFriendReqStatus] = React.useState<string | null>(
    null
  );
  const [isFriend, setIsFriend] = React.useState<boolean>(false);
  React.useEffect(() => {
    let cancelled = false;
    const checkFriend = async () => {
      if (!other?.user_id) {
        if (!cancelled) setIsFriend(false);
        return;
      }
      try {
        const res = await fetch("/api/friends");
        if (!res.ok) return;
        const data = await res.json();
        const list: Array<{ user_id: string }> = data.friends || [];
        if (!cancelled)
          setIsFriend(list.some((f) => f.user_id === other.user_id));
      } catch {
        // ignore — if it fails, we leave button visible
      }
    };
    checkFriend();
    return () => {
      cancelled = true;
    };
  }, [other?.user_id]);
  const isColorValid = React.useMemo(() => {
    if (!color) return true;
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
  }, [color]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ name: name || null, color: color || null });
    } finally {
      setSaving(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!other?.user_id) return;
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: other.user_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send request");
      setFriendReqStatus("Request sent");
      setTimeout(() => setFriendReqStatus(null), 2000);
    } catch (e) {
      setFriendReqStatus((e as Error).message);
      setTimeout(() => setFriendReqStatus(null), 3000);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold">Session details</h2>
          <button onClick={onClose} className="text-sm text-gray-500">
            Close
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <div>
            <span className="font-medium">When:</span>
            <div className="mt-1 rounded bg-gray-50 p-2">
              {new Date(event.start).toLocaleString()} →{" "}
              {new Date(event.end).toLocaleTimeString()}
            </div>
          </div>
          <div>
            <span className="font-medium">Type:</span> {event.sessionType} •{" "}
            {event.durationMin} min
          </div>
          {isOwner && (
            <div className="grid grid-cols-1 gap-3 pt-2">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Session name
                </label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Optional name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    className="h-9 w-12 cursor-pointer rounded-md border p-1"
                    value={color || "#eef2ff"}
                    onChange={(e) => setColor(e.target.value)}
                    title="Pick a color"
                  />
                  <input
                    className={`w-40 rounded-md border px-3 py-2 text-sm ${
                      isColorValid ? "border-gray-300" : "border-red-500"
                    }`}
                    placeholder="#eef2ff"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
                {!isColorValid && (
                  <p className="mt-1 text-xs text-red-600">
                    Enter a valid hex color like #abc or #aabbcc
                  </p>
                )}
              </div>
            </div>
          )}
          {otherName && (
            <div>
              <span className="font-medium">Partner:</span> {otherName}
              {other?.email ? (
                <div className="text-xs text-gray-500">{other.email}</div>
              ) : null}
            </div>
          )}
          <div className="pt-2">
            <span className="font-medium">Join link:</span>
            <div className="mt-1 text-sm break-all">
              <a
                className="text-indigo-600 hover:underline"
                href={`/sessions/${event.id}`}
              >
                /sessions/{event.id}
              </a>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-green-700">{friendReqStatus}</div>
          <div className="flex gap-2">
            {other && !isFriend && (
              <button
                onClick={sendFriendRequest}
                className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100"
              >
                Send friend request
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleSave}
                disabled={saving || !isColorValid}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
