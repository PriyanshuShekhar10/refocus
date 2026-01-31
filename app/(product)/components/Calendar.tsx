"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "@/types/calendar";
import {
  startOfDay,
  addMinutes,
  addDays,
  ymd,
  minutesBetween,
  formatHour,
} from "@/lib/utils";
import {
  CALENDAR_LAYOUT,
  TIME_CONFIG,
  DEFAULT_DURATION,
  DEFAULT_DURATION_FILTER,
  type DurationMin,
} from "@/constants/calendar";
import { useCalendarSessions } from "@/hooks/useCalendarSessions";
import { useCalendarGrid } from "@/hooks/useCalendarGrid";
import { BookingModal } from "./Calendar/Modals/BookingModal";
import { Toast } from "./Calendar/Modals/Toast";
import { ConfirmModal } from "./Calendar/Modals/ConfirmModal";
import { SessionDetailsModal } from "./Calendar/Modals/SessionDetailsModal";
import { CalendarSidebar } from "./Calendar/CalendarSidebar";
import { CalendarHeader } from "./Calendar/CalendarHeader";
import { CalendarEventCard } from "./Calendar/CalendarEventCard";

// ============================================
// Types
// ============================================

interface CalendarProps {
  startHour?: number;
  endHour?: number;
  stepMinutes?: 15 | 30;
  visibleDays?: number;
  startDate?: Date;
  events?: CalendarEvent[];
  locale?: string;
  onEventsChange?: (next: CalendarEvent[]) => void;
  className?: string;
}

// ============================================
// Calendar Component
// ============================================

export default function Calendar({
  startHour = 0,
  endHour = 24,
  stepMinutes = 15,
  visibleDays = 3,
  startDate: startDateProp,
  events: eventsProp,
  locale = TIME_CONFIG.locale,
  onEventsChange,
  className = "",
}: CalendarProps) {
  const { hourBlockHeight, minorLinePositions } = CALENDAR_LAYOUT;

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

  // Duration filter and creation states
  const [durationFilter, setDurationFilter] = useState<DurationMin[]>(
    DEFAULT_DURATION_FILTER,
  );
  const [createDuration, setCreateDuration] =
    useState<DurationMin>(DEFAULT_DURATION);
  const [createQuiet, setCreateQuiet] = useState<boolean>(false);

  // Modal states
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
  const [createModalInfo, setCreateModalInfo] = useState<null | {
    start: Date;
    preferred: DurationMin;
    whenIst: string;
  }>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Use the sessions hook for data management
  const {
    events,
    currentUserId,
    createSession,
    deleteSession,
    joinSession,
    updateSessionMeta,
  } = useCalendarSessions({
    days,
    onEventsChange,
    eventsProp,
  });

  // Filter events by duration
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

    for (const k in map) {
      map[k].sort((a, b) => +new Date(a.start) - +new Date(b.start));
    }

    return map;
  }, [days, events, durationFilter]);

  // Use the grid hook for layout and interactions
  const {
    gridRef,
    hoverState,
    now,
    nowLine,
    minuteToPx,
    handleGridClick: getGridClickInfo,
    handleGridMouseMove,
    handleGridMouseLeave,
    handleGridScroll,
  } = useCalendarGrid({
    days,
    startHour,
    endHour,
    stepMinutes,
    visibleDays,
    createDuration,
    eventsByDay,
  });

  // Navigation handlers
  const goToday = () => setStartDate(startOfDay(new Date()));
  const shiftRange = (deltaDays: number) =>
    setStartDate((d) => addDays(d, deltaDays));

  // Duration filter handler
  const handleDurationFilterChange = (duration: DurationMin) => {
    setDurationFilter((prev) =>
      prev.includes(duration)
        ? prev.filter((d) => d !== duration)
        : [...prev, duration],
    );
  };

  // Booking handlers
  const handleBookSlot = (event: CalendarEvent) => {
    setBookingQuiet(false);
    setBookingModalEvent(event);
  };

  const handleConfirmBooking = async () => {
    if (!bookingModalEvent) return;
    setBookingModalEvent(null);
    try {
      await joinSession(bookingModalEvent.id, bookingQuiet);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  // Session meta update handler
  const handleUpdateSessionMeta = async (
    id: string,
    patch: { name?: string | null; color?: string | null },
  ) => {
    try {
      await updateSessionMeta(id, patch);
      setToast("Session updated");
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  // Grid click handler for creating sessions
  const handleGridClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const clickInfo = getGridClickInfo(e);
    if (!clickInfo) return;

    const { dayDate, start, minutesOfDay } = clickInfo;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Prevent creating sessions in the past
    if (
      ymd(dayDate) < ymd(now) ||
      (ymd(dayDate) === ymd(now) && minutesOfDay < nowMinutes)
    ) {
      setToast("Cannot create a session in the past");
      setTimeout(() => setToast(null), 2000);
      return;
    }

    // Check for overlaps
    const dayKey = ymd(dayDate);
    const overlaps = (eventsByDay[dayKey] ?? []).some((ev) => {
      const s = new Date(ev.start);
      const eEnd = new Date(ev.end);
      const newEnd = addMinutes(start, createDuration);
      return new Date(start) < eEnd && newEnd > s;
    });

    if (overlaps) {
      setToast("Slot unavailable");
      setTimeout(() => setToast(null), 2000);
      return;
    }

    // Show creation confirmation modal
    const whenIst = start.toLocaleString(TIME_CONFIG.locale, {
      timeZone: TIME_CONFIG.timezone,
    });
    setCreateQuiet(false);
    setCreateModalInfo({ start, preferred: createDuration, whenIst });
    setConfirmModal({
      title: "Create session",
      confirmText: "Create",
      cancelText: "Cancel",
      confirmVariant: "success",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await createSession(start, createDuration, createQuiet);
        } catch (e) {
          alert((e as Error).message);
        }
        setCreateModalInfo(null);
      },
    });
  };

  return (
    <div className={`flex h-[calc(100vh-2rem)] w-full gap-4 ${className}`}>
      <CalendarSidebar
        durationFilter={durationFilter}
        onDurationFilterChange={handleDurationFilterChange}
        createDuration={createDuration}
        onCreateDurationChange={setCreateDuration}
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
              <div
                key={i}
                className="relative text-right"
                style={{ height: hourBlockHeight }}
              >
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
                    className="relative border-t border-gray-100 dark:border-gray-800"
                    style={{ height: hourBlockHeight }}
                  >
                    {/* 15/30/45 min minor lines */}
                    {minorLinePositions.map((yy, j) => (
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
