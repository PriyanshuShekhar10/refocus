"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CalendarEvent,
  FetchedSession,
  CalendarProps,
} from "@/types/calendar";
import {
  toISO,
  startOfDay,
  addMinutes,
  addDays,
  ymd,
  clamp,
  minutesBetween,
  formatHour,
} from "@/lib/utils";
import { BookingModal } from "./Calendar/Modals/BookingModal";
import { Toast } from "./Calendar/Modals/Toast";
import { ConfirmModal } from "./Calendar/Modals/ConfirmModal";
import { SessionDetailsModal } from "./Calendar/Modals/SessionDetailsModal";
import { CalendarSidebar } from "./Calendar/CalendarSidebar";
import { CalendarHeader } from "./Calendar/CalendarHeader";
import { CalendarEventCard } from "./Calendar/CalendarEventCard";

/* =========================
    Calendar Component
========================= */
export default function Calendar({
  startHour = 0,
  endHour = 24,
  stepMinutes = 15,
  visibleDays = 3,
  startDate: startDateProp,
  events: eventsProp,
  // presence,
  locale = "en-IN",
  onEventsChange,
  className = "",
}: CalendarProps) {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(() =>
    startDateProp ? new Date(startDateProp) : startOfDay(today),
  );
  useEffect(() => {
    if (startDateProp) setStartDate(startOfDay(new Date(startDateProp)));
  }, [startDateProp]);

  const days = useMemo(
    () => new Array(visibleDays).fill(0).map((_, i) => addDays(startDate, i)),
    [visibleDays, startDate],
  );

  const totalMinutes = (endHour - startHour) * 60;

  const [internalEvents, setInternalEvents] = useState<CalendarEvent[]>(
    () => eventsProp ?? [],
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
    [onEventsChange, eventsProp, events],
  );

  // --- NEW: State for filters and booking modal ---
  const [durationFilter, setDurationFilter] = useState<number[]>([25, 50, 75]);
  const [bookingModalEvent, setBookingModalEvent] =
    useState<CalendarEvent | null>(null);
  const [bookingQuiet, setBookingQuiet] = useState<boolean>(false);
  const [detailsModalEvent, setDetailsModalEvent] =
    useState<CalendarEvent | null>(null);
  const [confirmModal, setConfirmModal] = useState<null | {
    title: string;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: "danger" | "success";
    onConfirm: () => void | Promise<void>;
  }>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [createDuration, setCreateDuration] = useState<25 | 50 | 75>(25);
  const [createQuiet, setCreateQuiet] = useState<boolean>(false);
  const [createModalInfo, setCreateModalInfo] = useState<null | {
    start: Date;
    preferred: 25 | 50 | 75;
    whenIst: string;
  }>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleDurationFilterChange = (duration: number) => {
    setDurationFilter((prev) =>
      prev.includes(duration)
        ? prev.filter((d) => d !== duration)
        : [...prev, duration],
    );
  };

  const handleBookSlot = (event: CalendarEvent) => {
    setBookingQuiet(false);
    setBookingModalEvent(event);
  };

  const handleConfirmBooking = async () => {
    if (!bookingModalEvent) return;
    const id = bookingModalEvent.id;
    // Optimistic update: mark as booked locally
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "booked" } : e)),
    );
    setBookingModalEvent(null);
    try {
      const res = await fetch(`/api/sessions/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiet: bookingQuiet }),
      });
      if (!res.ok)
        throw new Error((await res.json()).error || "Failed to join");
    } catch (e) {
      // revert on failure
      setEvents((prev) =>
        prev.map((ev) => (ev.id === id ? { ...ev, status: "available" } : ev)),
      );
      alert((e as Error).message);
    }
  };

  // Update session fields (name/color) then update local state
  const handleUpdateSessionMeta = async (
    id: string,
    patch: { name?: string | null; color?: string | null },
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
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
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
  const [hoverState, setHoverState] = useState<null | {
    dayIndex: number;
    yPx: number; // snapped top relative to day column
    label: string; // time label
    previewTop: number; // same as yPx
    overEvent?: boolean; // whether cursor is over an existing event
  }>(null);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const autoScrolledKeyRef = useRef<string | null>(null);

  const goToday = () => setStartDate(startOfDay(new Date()));
  const shiftRange = (deltaDays: number) =>
    setStartDate((d) => addDays(d, deltaDays));

  // --- UPDATED: Memoized events now filter based on duration ---
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const d of days) map[ymd(d)] = [];

    const filteredEvents = events.filter((ev) =>
      durationFilter.includes(ev.durationMin),
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
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const from = toISO(days[0]);
      const to = toISO(addDays(days[days.length - 1], 1));
      try {
        const res = await fetch(
          `/api/sessions?from=${encodeURIComponent(
            from,
          )}&to=${encodeURIComponent(to)}`,
        );
        let data: unknown = null;
        try {
          data = await res.json();
        } catch {}
        if (!res.ok) {
          const errMsg =
            (data as { error?: string } | null)?.error || res.statusText;
          console.error("/api/sessions failed", errMsg);
          setToast("Could not load sessions");
          setTimeout(() => setToast(null), 3000);
          return;
        }
        if (cancelled) return;
        const payload = (data || {}) as {
          currentUserId?: string | null;
          sessions?: FetchedSession[];
        };
        setCurrentUserId(payload.currentUserId ?? null);
        const mapped: CalendarEvent[] = (payload.sessions ?? []).map(
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
          }),
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

  const createSession = async (
    start: Date,
    durationMin: 25 | 50 | 75,
    quietOwner: boolean = false,
  ) => {
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
        ? [
            {
              user_id: currentUserId,
              joined_at: new Date().toISOString(),
              quiet: quietOwner,
            },
          ]
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
          quietOwner,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setEvents((prev) =>
        prev.map((e) => (e.id === tempId ? { ...e, id: data.id } : e)),
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
    const dayWidth = contentWidth / visibleDays;
    const dayIndex = clamp(
      Math.floor(xAdjusted / dayWidth),
      0,
      visibleDays - 1,
    );
    const dayDate = days[dayIndex];
    // Y to minutes
    const scroller = gridRef.current;
    const y = e.clientY - rect.top;
    const yContent = y + (scroller?.scrollTop ?? 0);
    // use selected creation duration
    const preferred = createDuration;
    const minutesFromTop = Math.round(yContent / rowPx) * stepMinutes;
    const minutesOfDay = clamp(
      minutesFromTop + startHour * 60,
      startHour * 60,
      endHour * 60 - preferred,
    );
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (
      ymd(dayDate) < ymd(now) ||
      (ymd(dayDate) === ymd(now) && minutesOfDay < nowMinutes)
    ) {
      setToast("Cannot create a session in the past");
      setTimeout(() => setToast(null), 2000);
      return;
    }

    const start = new Date(startOfDay(dayDate));
    start.setMinutes(minutesOfDay);
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
    // Ask confirmation before creating a session using modal
    const whenIst = start.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    setCreateQuiet(false);
    setCreateModalInfo({ start, preferred, whenIst });
    setConfirmModal({
      title: "Create session",
      confirmText: "Create",
      cancelText: "Cancel",
      confirmVariant: "success",
      onConfirm: () => {
        setConfirmModal(null);
        createSession(start, preferred, createQuiet);
        setCreateModalInfo(null);
      },
    });
  };

  // Hover: show a precise time cursor and slot preview
  const computeHoverFromClient = (clientX: number, clientY: number) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const scroller = gridRef.current;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const gutter = 64; // w-16 time gutter
    const contentWidth = Math.max(0, rect.width - gutter);
    const xAdjusted = Math.max(0, x - gutter);
    const dayWidth = contentWidth / visibleDays;
    const dayIndex = clamp(
      Math.floor(xAdjusted / dayWidth),
      0,
      visibleDays - 1,
    );
    const yContent = y + (scroller?.scrollTop ?? 0);
    const minutesFromTopRaw = (yContent / rowPx) * stepMinutes;
    const minutesFromTop =
      Math.round(minutesFromTopRaw / stepMinutes) * stepMinutes; // snap
    const minutesOfDay = clamp(
      minutesFromTop + startHour * 60,
      startHour * 60,
      endHour * 60 - createDuration,
    );
    const d = days[dayIndex];
    const when = new Date(startOfDay(d));
    when.setMinutes(minutesOfDay);
    const label = when.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
    // Determine if the cursor is over an existing event on this day
    const dayKey = ymd(d);
    const overEvent = (eventsByDay[dayKey] ?? []).some((ev) => {
      const s = new Date(ev.start);
      const startMin = minutesBetween(startOfDay(s), s);
      const endMin = startMin + ev.durationMin;
      return minutesOfDay >= startMin && minutesOfDay < endMin;
    });
    const topPx = minuteToPx(minutesOfDay - startHour * 60);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (
      ymd(d) < ymd(now) || // previous day
      (ymd(d) === ymd(now) && minutesOfDay < nowMinutes) // past minutes today
    ) {
      setHoverState(null); // hide hover for past
      return;
    }

    setHoverState({
      dayIndex,
      yPx: topPx,
      label,
      previewTop: topPx,
      overEvent,
    });
  };
  const handleGridMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    computeHoverFromClient(e.clientX, e.clientY);
  };

  // Auto-scroll to current time once per visible range
  useEffect(() => {
    if (!gridRef.current) return;
    const day0 = days[0];
    const dayLast = days[days.length - 1];
    if (!day0 || !dayLast) return;
    const start = startOfDay(day0).getTime();
    const end = addDays(startOfDay(dayLast), 1).getTime();
    const nowMs = now.getTime();
    const todayVisible = nowMs >= start && nowMs <= end;
    if (!todayVisible) return;
    if (nowLine == null) return;
    const key = `${ymd(day0)}-${ymd(dayLast)}`;
    if (autoScrolledKeyRef.current === key) return;
    const scroller = gridRef.current;
    const target = Math.max(0, nowLine - scroller.clientHeight / 2);
    scroller.scrollTop = target;
    autoScrolledKeyRef.current = key;
  }, [days, nowLine, now]);
  const handleGridMouseLeave = () => {
    setHoverState(null);
    lastMousePos.current = null;
  };
  const handleGridScroll: React.UIEventHandler<HTMLDivElement> = () => {
    // Keep hover preview under the cursor on scroll; if no cursor, hide it
    if (!lastMousePos.current) {
      setHoverState(null);
      return;
    }
    computeHoverFromClient(lastMousePos.current.x, lastMousePos.current.y);
  };

  return (
    <div className={`flex h-[calc(100vh-2rem)] w-full gap-4 ${className}`}>
      <CalendarSidebar
        durationFilter={durationFilter}
        onDurationFilterChange={handleDurationFilterChange}
        createDuration={createDuration}
        onCreateDurationChange={(d) => setCreateDuration(d as 25 | 50 | 75)}
      />

      {/* Right: Calendar Area */}
      <section className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <CalendarHeader
          startDate={startDate}
          locale={locale}
          onShiftRange={shiftRange}
          onGoToday={goToday}
        />

        <div
          ref={gridRef}
          className="relative flex h-[calc(100%-3.75rem)] overflow-auto"
          onClick={handleGridClick}
          onMouseMove={handleGridMouseMove}
          onMouseLeave={handleGridMouseLeave}
          onScroll={handleGridScroll}
        >
          {/* Time Gutter */}
          <div className="w-16 shrink-0 border-r bg-gray-50/80 pt-12 dark:border-gray-700 dark:bg-gray-800/80">
            {Array.from({ length: endHour - startHour }).map((_, i) => (
              <div key={i} className="relative h-[112px] text-right">
                {/* Top boundary corresponds to :30 of previous hour */}
                <span className="absolute right-2 top-0 text-[10px] text-gray-400 dark:text-gray-500">
                  :30
                </span>
                {/* Midpoint corresponds to the start of the next hour */}
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
                  {formatHour(startHour + i + 1)}
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
              <div
                key={ymd(d)}
                className="relative border-r dark:border-gray-700"
              >
                {/* Horizontal Lines */}
                {Array.from({ length: endHour - startHour }).map((_, i) => (
                  <div
                    key={i}
                    className="relative h-[112px] border-t border-gray-100 dark:border-gray-800"
                  >
                    {/* 15/30/45 min minor lines */}
                    {[28, 56, 84].map((yy, j) => (
                      <div
                        key={j}
                        className="pointer-events-none absolute inset-x-0"
                        style={{ top: yy }}
                      >
                        <div className="border-t border-dashed border-gray-100 dark:border-gray-800" />
                      </div>
                    ))}
                  </div>
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

                {/* Hover time + slot preview */}
                {hoverState && hoverState.dayIndex === dayIdx && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-30"
                    style={{ top: hoverState.yPx }}
                  >
                    <div className="h-px w-full bg-indigo-400/70" />
                    <div className="absolute left-2 -top-3 rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                      {hoverState.label} IST
                    </div>
                  </div>
                )}
                {hoverState &&
                  hoverState.dayIndex === dayIdx &&
                  !hoverState.overEvent && (
                    <div
                      className="pointer-events-none absolute inset-x-2 z-20"
                      style={{ top: hoverState.previewTop }}
                    >
                      <div
                        className="rounded-lg border border-indigo-400/70 bg-indigo-500/10"
                        style={{ height: minuteToPx(createDuration) }}
                      />
                    </div>
                  )}

                {/* Events */}
                <div className="absolute inset-0">
                  {(eventsByDay[ymd(d)] ?? []).map((ev) => {
                    const s = new Date(ev.start);
                    const top = minuteToPx(
                      minutesBetween(startOfDay(s), s) - startHour * 60,
                    );
                    const height = minuteToPx(ev.durationMin);
                    const isBooked =
                      ev.status === "booked" ||
                      (ev.participants?.length ?? 0) >= 2;
                    const isOwner =
                      ev.owner_id &&
                      currentUserId &&
                      ev.owner_id === currentUserId;

                    // Determine tooltip for owner on booked sessions: show other participant's name/email
                    const tooltip = (() => {
                      if (!(isOwner && isBooked)) return null;
                      const others = (ev.participants || []).filter(
                        (p) => p.user_id !== currentUserId,
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

                    const otherQuiet = isBooked
                      ? Boolean(
                          (ev.participants || []).find(
                            (p) => p.user_id !== currentUserId,
                          )?.quiet,
                        )
                      : false;

                    return (
                      <CalendarEventCard
                        key={ev.id}
                        event={ev}
                        isBooked={isBooked}
                        isOwner={!!isOwner}
                        otherQuiet={otherQuiet}
                        tooltip={tooltip}
                        top={top}
                        height={height}
                        onBook={() => handleBookSlot(ev)}
                        onDetails={() => setDetailsModalEvent(ev)}
                        onDelete={() => {
                          setConfirmModal({
                            title: "Delete session",
                            description: (
                              <span>
                                This action cannot be undone. Do you want to
                                delete this session?
                              </span>
                            ),
                            confirmText: "Delete",
                            cancelText: "Cancel",
                            onConfirm: () => {
                              setConfirmModal(null);
                              deleteSession(ev.id);
                            },
                          });
                        }}
                      />
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
          quiet={bookingQuiet}
          onChangeQuiet={setBookingQuiet}
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
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          description={
            confirmModal.description ??
            (confirmModal.title === "Create session" && createModalInfo ? (
              <div className="space-y-4">
                <div>
                  Create a <strong>{createModalInfo.preferred}-minute</strong>{" "}
                  session at
                  <br />
                  <strong>{createModalInfo.whenIst} (IST)</strong>?
                </div>
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={createQuiet}
                    onChange={(e) => setCreateQuiet(e.target.checked)}
                  />
                  Quiet session (start muted for you)
                </label>
              </div>
            ) : undefined)
          }
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          confirmVariant={
            confirmModal.title === "Create session" ? "success" : "danger"
          }
          onCancel={() => {
            setConfirmModal(null);
            setCreateModalInfo(null);
          }}
          onConfirm={confirmModal.onConfirm}
        />
      )}
    </div>
  );
}
