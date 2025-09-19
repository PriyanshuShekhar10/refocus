"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  // Simplified partner model for the frontend
  partner: { id: string; name: string; avatarUrl?: string } | null | "anyone";
  // Status to manage the booking flow
  status: "available" | "booked" | "in-progress" | "completed";
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
const snapMinutes = (m: number, step: number) => Math.round(m / step) * step;

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
  presence = [],
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
    () => eventsProp ?? demoEvents(startDate, visibleDays)
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

  const handleConfirmBooking = () => {
    if (!bookingModalEvent) return;
    // TODO: This is where you would make an API call to your backend.
    // The backend should validate availability and confirm the booking.

    // Optimistic UI update:
    setEvents((prevEvents) =>
      prevEvents.map((ev) =>
        ev.id === bookingModalEvent.id ? { ...ev, status: "booked" } : ev
      )
    );
    setBookingModalEvent(null); // Close modal on success
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
            {days.map((d, dayIdx) => (
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

                    return (
                      <div
                        key={ev.id}
                        className="absolute inset-x-2 z-20"
                        style={{ top }}
                      >
                        <div
                          style={{ height }}
                          className={`rounded-lg p-2 flex flex-col justify-between ${
                            isBooked
                              ? "bg-gray-200 border border-gray-300"
                              : "bg-indigo-50 border border-indigo-200 hover:border-indigo-400 cursor-pointer"
                          }`}
                          onClick={() => !isBooked && handleBookSlot(ev)}
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
                              {ev.partner === "anyone" && "Partner needed"}
                              {ev.partner === null && "Instant"}
                            </span>
                            {!isBooked && (
                              <button className="text-xs font-semibold text-indigo-600">
                                Book
                              </button>
                            )}
                            {isBooked && (
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

/* =========================
    Demo data + utilities
========================= */
function demoEvents(base: Date, days: number): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  const first = startOfDay(base);
  const types: CalendarEvent["sessionType"][] = [
    "focus",
    "deep-work",
    "learning",
  ];
  const durations: CalendarEvent["durationMin"][] = [25, 50, 75];

  for (let i = 0; i < days; i++) {
    for (let j = 0; j < 5; j++) {
      // Create 5 sample events per day
      const d = addDays(first, i);
      const startHour = 8 + Math.floor(Math.random() * 8);
      const startMinutes = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
      const s1 = new Date(d);
      s1.setHours(startHour, startMinutes, 0, 0);

      const duration = durations[Math.floor(Math.random() * 3)];
      const e1 = addMinutes(s1, duration);

      out.push({
        id: `seed_${i}_${j}`,
        title: "Available Slot",
        start: toISO(s1),
        end: toISO(e1),
        durationMin: duration,
        sessionType: types[Math.floor(Math.random() * 3)],
        partner: Math.random() > 0.6 ? null : "anyone",
        status: "available",
      });
    }
  }
  return out;
}

function formatHour(h24: number) {
  const h = ((h24 + 11) % 12) + 1;
  const suffix = h24 < 12 ? "AM" : "PM";
  return `${h} ${suffix}`;
}
