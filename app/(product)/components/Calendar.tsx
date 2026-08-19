"use client";

import { useEffect, useMemo, useReducer, useCallback, useState } from "react";
import type { CalendarEvent } from "@/types/calendar";
import {
  addMinutes,
  formatHour,
} from "@/lib/utils";
import { formatLocalDate, formatLocalTimeRange } from "@/lib/localTime";
import {
  addDaysInTimeZone,
  minutesOfDayInTimeZone,
  startOfDayInTimeZone,
  ymdInTimeZone,
} from "@/lib/zonedTime";
import { useUserTimezone } from "@/components/user-timezone-provider";
import {
  CALENDAR_LAYOUT,
  DEFAULT_DURATION,
  DEFAULT_DURATION_FILTER,
  isValidDuration,
  type DurationMin,
} from "@/constants/calendar";
import { useCalendarSessions } from "@/hooks/useCalendarSessions";
import { useCalendarGrid } from "@/hooks/useCalendarGrid";
import { useCommunityModeration } from "@/hooks/useCommunityModeration";
import { BookingModal } from "./Calendar/Modals/BookingModal";
import { Toast } from "./Calendar/Modals/Toast";
import { ConfirmModal, partnerNoteField } from "./Calendar/Modals/ConfirmModal";
import { SessionDetailsModal } from "./Calendar/Modals/SessionDetailsModal";
import { CalendarSidebar } from "./Calendar/CalendarSidebar";
import { CalendarHeader } from "./Calendar/CalendarHeader";
import { CalendarEventCard } from "./Calendar/CalendarEventCard";
import { CalendarRightSidebar } from "./Calendar/CalendarRightSidebar";
import { isCallJoinable, hasSessionStarted } from "@/lib/sessionWindow";

// ============================================
// Types
// ============================================

interface CalendarProps {
  startHour?: number;
  endHour?: number;
  stepMinutes?: 15 | 30;
  startDate?: Date;
  events?: CalendarEvent[];
  locale?: string;
  onEventsChange?: (next: CalendarEvent[]) => void;
  className?: string;
}

/** CalendarEvent with precomputed epoch ms for fast overlap checks */
type ProcessedEvent = CalendarEvent & {
  startMs: number;
  endMs: number;
  /** minutes from midnight for positioning */
  startMinutes: number;
};

type SidebarProfilePreview = {
  username: string;
  name: string;
  about?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
};

// ============================================
// UI State Machine (useReducer)
// ============================================

/** Modal state – discriminated union ensures only one modal open at a time */
type ModalState =
  | { type: "none" }
  | { type: "booking"; event: CalendarEvent; quiet: boolean }
  | { type: "details"; event: CalendarEvent }
  | {
      type: "confirm-create";
      start: Date;
      preferred: DurationMin;
      whenLabel: string;
      quiet: boolean;
    }
  | { type: "confirm-delete"; event: CalendarEvent }
  | { type: "confirm-leave"; event: CalendarEvent };

/** Available view options for number of days */
type ViewDays = 3 | 5 | 7;

interface UIState {
  /** Currently visible date */
  startDate: Date;
  /** Number of days to show */
  visibleDays: ViewDays;
  /** Duration filter for sidebar */
  durationFilter: DurationMin[];
  /** Duration for creating new sessions */
  createDuration: DurationMin;
  /** Modal state (only one modal can be open) */
  modal: ModalState;
  /** Toast message (shown briefly) */
  toast: string | null;
}

type UIAction =
  | { type: "SET_START_DATE"; date: Date }
  | { type: "SHIFT_RANGE"; delta: number; timeZone: string }
  | { type: "GO_TODAY"; timeZone: string }
  | { type: "SET_VISIBLE_DAYS"; days: ViewDays }
  | { type: "TOGGLE_DURATION_FILTER"; duration: DurationMin }
  | { type: "SET_CREATE_DURATION"; duration: DurationMin }
  | { type: "OPEN_BOOKING_MODAL"; event: CalendarEvent }
  | { type: "SET_BOOKING_QUIET"; quiet: boolean }
  | { type: "OPEN_DETAILS_MODAL"; event: CalendarEvent }
  | {
      type: "OPEN_CREATE_CONFIRM";
      start: Date;
      preferred: DurationMin;
      whenLabel: string;
    }
  | { type: "SET_CREATE_QUIET"; quiet: boolean }
  | { type: "OPEN_DELETE_CONFIRM"; event: CalendarEvent }
  | { type: "OPEN_LEAVE_CONFIRM"; event: CalendarEvent }
  | { type: "CLOSE_MODAL" }
  | { type: "SHOW_TOAST"; message: string }
  | { type: "CLEAR_TOAST" };

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_START_DATE":
      return { ...state, startDate: action.date };
    case "SHIFT_RANGE":
      return {
        ...state,
        startDate: addDaysInTimeZone(
          state.startDate,
          action.delta * state.visibleDays,
          action.timeZone,
        ),
      };
    case "GO_TODAY":
      return {
        ...state,
        startDate: startOfDayInTimeZone(new Date(), action.timeZone),
      };
    case "SET_VISIBLE_DAYS":
      return { ...state, visibleDays: action.days };
    case "TOGGLE_DURATION_FILTER":
      return {
        ...state,
        durationFilter: state.durationFilter.includes(action.duration)
          ? state.durationFilter.filter((d) => d !== action.duration)
          : [...state.durationFilter, action.duration],
      };
    case "SET_CREATE_DURATION":
      return { ...state, createDuration: action.duration };
    case "OPEN_BOOKING_MODAL":
      return {
        ...state,
        modal: { type: "booking", event: action.event, quiet: false },
      };
    case "SET_BOOKING_QUIET":
      if (state.modal.type !== "booking") return state;
      return { ...state, modal: { ...state.modal, quiet: action.quiet } };
    case "OPEN_DETAILS_MODAL":
      return { ...state, modal: { type: "details", event: action.event } };
    case "OPEN_CREATE_CONFIRM":
      return {
        ...state,
        modal: {
          type: "confirm-create",
          start: action.start,
          preferred: action.preferred,
          whenLabel: action.whenLabel,
          quiet: false,
        },
      };
    case "SET_CREATE_QUIET":
      if (state.modal.type !== "confirm-create") return state;
      return { ...state, modal: { ...state.modal, quiet: action.quiet } };
    case "OPEN_DELETE_CONFIRM":
      return {
        ...state,
        modal: { type: "confirm-delete", event: action.event },
      };
    case "OPEN_LEAVE_CONFIRM":
      return {
        ...state,
        modal: { type: "confirm-leave", event: action.event },
      };
    case "CLOSE_MODAL":
      return { ...state, modal: { type: "none" } };
    case "SHOW_TOAST":
      return { ...state, toast: action.message };
    case "CLEAR_TOAST":
      return { ...state, toast: null };
    default:
      return state;
  }
}

function createInitialState(startDateProp?: Date): UIState {
  // Browser-local until UserTimezoneProvider applies preference.
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC";
  return {
    startDate: startDateProp
      ? startOfDayInTimeZone(startDateProp, tz)
      : startOfDayInTimeZone(new Date(), tz),
    visibleDays: 3,
    durationFilter: DEFAULT_DURATION_FILTER,
    createDuration: DEFAULT_DURATION,
    modal: { type: "none" },
    toast: null,
  };
}

// ============================================
// Calendar Component
// ============================================

export default function Calendar({
  startHour = 0,
  endHour = 24,
  stepMinutes = 15,
  startDate: startDateProp,
  events: eventsProp,
  locale,
  onEventsChange,
  className = "",
}: CalendarProps) {
  const { hourBlockHeight, minorLinePositions } = CALENDAR_LAYOUT;
  const { timeZone } = useUserTimezone();
  const { canBookSessions, bannedMessage } = useCommunityModeration();

  // UI state machine
  const [ui, dispatch] = useReducer(
    uiReducer,
    startDateProp,
    createInitialState,
  );

  // Re-anchor "today" when the display timezone preference changes.
  useEffect(() => {
    dispatch({ type: "GO_TODAY", timeZone });
  }, [timeZone]);
  const [profilePreview, setProfilePreview] = useState<SidebarProfilePreview | null>(
    null,
  );

  // Sync external startDate prop
  useEffect(() => {
    if (startDateProp) {
      dispatch({ type: "SET_START_DATE", date: startDateProp });
    }
  }, [startDateProp]);

  // Sync create-duration default from saved user preferences.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/preferences");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const preferred = data?.preferences?.defaultSessionLength;
        if (!cancelled && typeof preferred === "number" && isValidDuration(preferred)) {
          dispatch({ type: "SET_CREATE_DURATION", duration: preferred });
        }
      } catch {
        // Keep fallback defaults when preferences cannot be loaded.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const days = useMemo(
    () =>
      new Array(ui.visibleDays)
        .fill(0)
        .map((_, i) => addDaysInTimeZone(ui.startDate, i, timeZone)),
    [ui.visibleDays, ui.startDate, timeZone],
  );

  // Toast auto-clear
  useEffect(() => {
    if (ui.toast) {
      const timer = setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2000);
      return () => clearTimeout(timer);
    }
  }, [ui.toast]);

  // Use the sessions hook for data management
  const {
    events,
    currentUserId,
    createSession,
    deleteSession,
    leaveSession,
    joinSession,
    updateSessionMeta,
  } = useCalendarSessions({
    days,
    onEventsChange,
    eventsProp,
  });

  // Filter events by duration and precompute epoch ms for fast overlap checks
  const eventsByDay = useMemo(() => {
    const map: Record<string, ProcessedEvent[]> = {};
    for (const d of days) map[ymdInTimeZone(d, timeZone)] = [];

    const filteredEvents = events.filter((ev) =>
      ui.durationFilter.includes(ev.durationMin),
    );

    for (const ev of filteredEvents) {
      const startMs = new Date(ev.start).getTime();
      const endMs = new Date(ev.end).getTime();
      const evStartDate = new Date(startMs);
      const startMinutes = minutesOfDayInTimeZone(evStartDate, timeZone);
      const key = ymdInTimeZone(evStartDate, timeZone);

      if (map[key]) {
        map[key].push({ ...ev, startMs, endMs, startMinutes });
      }
    }

    // Sort by startMs (no Date allocation)
    for (const k in map) {
      map[k].sort((a, b) => a.startMs - b.startMs);
    }

    return map;
  }, [days, events, ui.durationFilter, timeZone]);

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
    visibleDays: ui.visibleDays,
    createDuration: ui.createDuration,
    eventsByDay,
    timeZone,
  });

  // Navigation handlers (dispatch actions)
  const goToday = useCallback(
    () => dispatch({ type: "GO_TODAY", timeZone }),
    [timeZone],
  );
  const shiftRange = useCallback(
    (delta: number) => dispatch({ type: "SHIFT_RANGE", delta, timeZone }),
    [timeZone],
  );
  const setVisibleDays = useCallback(
    (days: ViewDays) => dispatch({ type: "SET_VISIBLE_DAYS", days }),
    [],
  );
  const handleSetCreateDuration = useCallback(
    (duration: DurationMin) =>
      dispatch({ type: "SET_CREATE_DURATION", duration }),
    [],
  );

  // Booking flow
  const handleBookSlot = useCallback((event: CalendarEvent) => {
    if (hasSessionStarted(event.start)) {
      dispatch({
        type: "SHOW_TOAST",
        message: "This session has already started",
      });
      return;
    }
    dispatch({ type: "OPEN_BOOKING_MODAL", event });
  }, []);

  const handleConfirmBooking = useCallback(async () => {
    if (ui.modal.type !== "booking") return;
    const { event, quiet } = ui.modal;
    try {
      await joinSession(event.id, quiet);
    } catch (e) {
      dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
    }
  }, [ui.modal, joinSession]);

  // Session meta update
  const handleUpdateSessionMeta = useCallback(
    async (id: string, patch: { name?: string | null; color?: string | null }) => {
      try {
        await updateSessionMeta(id, patch);
        dispatch({ type: "SHOW_TOAST", message: "Session updated" });
      } catch (e) {
        dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
      }
    },
    [updateSessionMeta],
  );

  // Delete flow
  const handleDeleteSession = useCallback(async (message?: string) => {
    if (ui.modal.type !== "confirm-delete") return;
    const { event } = ui.modal;
    try {
      await deleteSession(event.id, message);
    } catch (e) {
      dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
    }
  }, [ui.modal, deleteSession]);

  const handleLeaveSession = useCallback(async (message?: string) => {
    if (ui.modal.type !== "confirm-leave") return;
    const { event } = ui.modal;
    try {
      await leaveSession(event.id, message);
    } catch (e) {
      dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
    }
  }, [ui.modal, leaveSession]);

  // Create flow
  const handleCreateSession = useCallback(async () => {
    if (ui.modal.type !== "confirm-create") return;
    const { start, preferred, quiet } = ui.modal;
    try {
      await createSession(start, preferred, quiet);
    } catch (e) {
      dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
    }
  }, [ui.modal, createSession]);

  // Grid click handler for creating sessions
  const handleGridClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const clickInfo = getGridClickInfo(e);
    if (!clickInfo) return;

    if (!canBookSessions) {
      dispatch({ type: "SHOW_TOAST", message: bannedMessage });
      return;
    }

    const { dayDate, start, minutesOfDay } = clickInfo;
    const nowMinutes = minutesOfDayInTimeZone(now, timeZone);

    // Prevent creating sessions in the past
    if (
      ymdInTimeZone(dayDate, timeZone) < ymdInTimeZone(now, timeZone) ||
      (ymdInTimeZone(dayDate, timeZone) === ymdInTimeZone(now, timeZone) &&
        minutesOfDay < nowMinutes)
    ) {
      dispatch({ type: "SHOW_TOAST", message: "Cannot create a session in the past" });
      return;
    }

    // Only block if the overlapping session is one I'm already in (owner or participant).
    // Other people's slots (different duration or same time) don't block me — we just won't match.
    const dayKey = ymdInTimeZone(dayDate, timeZone);
    const startMs = start.getTime();
    const newEndMs = addMinutes(start, ui.createDuration).getTime();
    const mySessions = (eventsByDay[dayKey] ?? []).filter(
      (ev) =>
        (ev.owner_id && currentUserId && ev.owner_id === currentUserId) ||
        (ev.participants ?? []).some((p) => p.user_id === currentUserId),
    );
    const overlaps = mySessions.some(
      (ev) => startMs < ev.endMs && newEndMs > ev.startMs,
    );

    if (overlaps) {
      dispatch({ type: "SHOW_TOAST", message: "You already have a session at this time" });
      return;
    }

    // Show creation confirmation modal (browser-local wall clock)
    const whenLabel = formatLocalDate(start, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    dispatch({
      type: "OPEN_CREATE_CONFIRM",
      start,
      preferred: ui.createDuration,
      whenLabel,
    });
  };

  return (
    <div className={`flex h-full w-full gap-4 ${className}`}>
      <CalendarSidebar
        createDuration={ui.createDuration}
        onCreateDurationChange={handleSetCreateDuration}
        events={events}
        currentUserId={currentUserId}
        onJoinSession={(ev) => {
          if (hasSessionStarted(ev.start)) {
            dispatch({
              type: "SHOW_TOAST",
              message: "This session has already started",
            });
            return;
          }
          dispatch({ type: "OPEN_BOOKING_MODAL", event: ev });
        }}
        onDetailsSession={(ev) => dispatch({ type: "OPEN_DETAILS_MODAL", event: ev })}
        onLeaveSession={(ev) => dispatch({ type: "OPEN_LEAVE_CONFIRM", event: ev })}
        onDeleteSession={(ev) => dispatch({ type: "OPEN_DELETE_CONFIRM", event: ev })}
      />

      {/* Right: Calendar Area */}
      <section className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <CalendarHeader
          startDate={ui.startDate}
          locale={locale}
          onShiftRange={shiftRange}
          onGoToday={goToday}
          visibleDays={ui.visibleDays}
          onVisibleDaysChange={setVisibleDays}
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
            style={{ gridTemplateColumns: `repeat(${ui.visibleDays}, 1fr)` }}
          >
            {days.map((d, dayIdx) => {
              const isToday =
                ymdInTimeZone(d, timeZone) === ymdInTimeZone(now, timeZone);
              return (
              <div
                key={ymdInTimeZone(d, timeZone)}
                className="relative border-r dark:border-gray-700"
              >
                <div
                  className={`sticky top-0 z-20 flex h-12 items-center justify-center border-b backdrop-blur-sm text-sm font-medium ${
                    isToday
                      ? "bg-[#FFF1D3]/95 text-[#5D1C6A] dark:bg-[#5D1C6A]/35 dark:text-[#FFB090]"
                      : "bg-white/95 text-gray-700 dark:bg-gray-900/95 dark:text-gray-300"
                  }`}
                >
                  {formatLocalDate(d, {
                    weekday: "short",
                    day: "numeric",
                    ...(ui.visibleDays <= 3 ? { month: "short" as const } : {}),
                  })}
                </div>
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
                {nowLine !== null &&
                  ymdInTimeZone(now, timeZone) === ymdInTimeZone(d, timeZone) && (
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
                    <div className="h-px w-full bg-[#CA5995]/70" />
                    <div className="absolute left-2 -top-3 rounded bg-[#5D1C6A] dark:bg-[#7A2D88] px-2 py-0.5 text-[10px] font-medium text-white shadow">
                      {hoverState.label}
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
                        className="rounded-lg border border-[#CA5995]/70 dark:border-[#CA5995]/45 bg-[#FFB090]/20 dark:bg-[#CA5995]/10"
                        style={{ height: minuteToPx(ui.createDuration) }}
                      />
                    </div>
                  )}

                {/* Events */}
                <div className="absolute inset-0">
                  {(() => {
                    const dayEvents = eventsByDay[ymdInTimeZone(d, timeZone)] ?? [];
                    const mySessionsOnDay = dayEvents.filter(
                      (e) =>
                        (e.owner_id && currentUserId && e.owner_id === currentUserId) ||
                        (e.participants ?? []).some((p) => p.user_id === currentUserId),
                    );

                    const eligibleCompactEvents = dayEvents.filter((ev) => {
                      const isBooked =
                        ev.status === "booked" ||
                        (ev.participants?.length ?? 0) >= 2;
                      const isOwner =
                        ev.owner_id &&
                        currentUserId &&
                        ev.owner_id === currentUserId;
                      const isCompact = !(isBooked || isOwner);
                      if (!isCompact) return false;

                      const overlapsMine = mySessionsOnDay.some(
                        (e) =>
                          e.id !== ev.id &&
                          ev.startMs < e.endMs &&
                          ev.endMs > e.startMs,
                      );
                      return !overlapsMine;
                    });

                    const compactStackMeta = new Map<
                      string,
                      { index: number; columns: number }
                    >();
                    const activeCompact: Array<{
                      id: string;
                      endMs: number;
                      index: number;
                    }> = [];

                    for (const compactEv of eligibleCompactEvents) {
                      for (let i = activeCompact.length - 1; i >= 0; i -= 1) {
                        if (activeCompact[i].endMs <= compactEv.startMs) {
                          activeCompact.splice(i, 1);
                        }
                      }

                      const usedIndexes = new Set(activeCompact.map((item) => item.index));
                      let nextIndex = 0;
                      while (usedIndexes.has(nextIndex)) nextIndex += 1;

                      activeCompact.push({
                        id: compactEv.id,
                        endMs: compactEv.endMs,
                        index: nextIndex,
                      });

                      const columns =
                        Math.max(...activeCompact.map((item) => item.index)) + 1;

                      for (const item of activeCompact) {
                        const existing = compactStackMeta.get(item.id);
                        compactStackMeta.set(item.id, {
                          index: item.index,
                          columns: Math.max(existing?.columns ?? 1, columns),
                        });
                      }
                    }

                    return dayEvents.map((ev) => {
                    // Use precomputed startMinutes (no Date allocation)
                    const top = minuteToPx(ev.startMinutes - startHour * 60);
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

                    const isMySession = isBooked || isOwner;
                    const isCompact = !isMySession;

                    // Don't show other people's available slots if they overlap my session (I'm ineligible)
                    const ineligibleBecauseOverlapsMine =
                      isCompact &&
                      mySessionsOnDay.some(
                        (e) =>
                          e.id !== ev.id &&
                          ev.startMs < e.endMs &&
                          ev.endMs > e.startMs,
                      );
                    if (ineligibleBecauseOverlapsMine) return null;

                    const compactMeta = compactStackMeta.get(ev.id);

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
                        isCompact={isCompact}
                        compactStackIndex={compactMeta?.index ?? 0}
                        compactStackTotal={compactMeta?.columns ?? 1}
                        onBook={() => handleBookSlot(ev)}
                        onDetails={() =>
                          dispatch({ type: "OPEN_DETAILS_MODAL", event: ev })
                        }
                        onDelete={() =>
                          dispatch({ type: "OPEN_DELETE_CONFIRM", event: ev })
                        }
                        onLeave={
                          isBooked && !isOwner
                            ? () =>
                                dispatch({ type: "OPEN_LEAVE_CONFIRM", event: ev })
                            : undefined
                        }
                        onPreviewProfile={(profile) => setProfilePreview(profile)}
                      />
                    );
                  });
                  })()}
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </section>

      {/* Right Sidebar - Greeting & Misc */}
      <CalendarRightSidebar
        sessionCount={events.filter((ev) => {
          const isOwner = ev.owner_id === currentUserId;
          const isParticipant = (ev.participants ?? []).some((p) => p.user_id === currentUserId);
          return isOwner || isParticipant;
        }).length}
        onGoToday={goToday}
        joinableSession={(() => {
          const joinable = events
            .filter((ev) => {
              const isBooked = (ev.participants?.length ?? 0) >= 2;
              if (!isBooked) return false;
              const start = new Date(ev.start);
              const end = ev.end ? new Date(ev.end) : new Date(start.getTime() + 60 * 60 * 1000);
              return isCallJoinable(start, end);
            })
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
          return joinable || null;
        })()}
        profilePreview={profilePreview}
        onClearProfilePreview={() => setProfilePreview(null)}
      />

      {/* Modals – only one can be open at a time (enforced by state machine) */}
      {ui.modal.type === "booking" && (
        <BookingModal
          event={ui.modal.event}
          onClose={() => dispatch({ type: "CLOSE_MODAL" })}
          quiet={ui.modal.quiet}
          onChangeQuiet={(quiet) =>
            dispatch({ type: "SET_BOOKING_QUIET", quiet })
          }
          onConfirm={handleConfirmBooking}
        />
      )}

      {ui.modal.type === "details" && (() => {
        const { event } = ui.modal; // capture for callback
        const isBooked = (event.participants?.length ?? 0) >= 2;
        const isOwner =
          event.owner_id && currentUserId && event.owner_id === currentUserId;
        return (
          <SessionDetailsModal
            event={event}
            onClose={() => dispatch({ type: "CLOSE_MODAL" })}
            currentUserId={currentUserId}
            onUpdate={(patch) => handleUpdateSessionMeta(event.id, patch)}
            onLeave={
              isBooked && !isOwner
                ? () => dispatch({ type: "OPEN_LEAVE_CONFIRM", event })
                : undefined
            }
          />
        );
      })()}

      {ui.modal.type === "confirm-create" && (
        <ConfirmModal
          title="Create session"
          description={
            <div className="space-y-4">
              <div>
                Create a <strong>{ui.modal.preferred}-minute</strong> session on{" "}
                <strong>{ui.modal.whenLabel}</strong> from{" "}
                <strong>
                  {formatLocalTimeRange(
                    ui.modal.start,
                    addMinutes(ui.modal.start, ui.modal.preferred),
                    { hour: "numeric", minute: "2-digit", hour12: true },
                  )}
                </strong>
                ?
              </div>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={ui.modal.quiet}
                  onChange={(e) =>
                    dispatch({ type: "SET_CREATE_QUIET", quiet: e.target.checked })
                  }
                />
                Quiet session (start muted for you)
              </label>
            </div>
          }
          confirmText="Create"
          cancelText="Cancel"
          confirmVariant="success"
          onCancel={() => dispatch({ type: "CLOSE_MODAL" })}
          onConfirm={handleCreateSession}
        />
      )}

      {ui.modal.type === "confirm-delete" && (
        <ConfirmModal
          title="Delete session"
          description={
            <span>
              This action cannot be undone. Do you want to delete this session?
            </span>
          }
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
          messageField={partnerNoteField(ui.modal.event, currentUserId)}
          onCancel={() => dispatch({ type: "CLOSE_MODAL" })}
          onConfirm={handleDeleteSession}
        />
      )}

      {ui.modal.type === "confirm-leave" && (
        <ConfirmModal
          title="Leave session"
          description={
            <span>
              Leave this session? The time slot will be free for the other person to match with someone else.
            </span>
          }
          confirmText="Leave session"
          cancelText="Cancel"
          confirmVariant="danger"
          messageField={partnerNoteField(ui.modal.event, currentUserId)}
          onCancel={() => dispatch({ type: "CLOSE_MODAL" })}
          onConfirm={handleLeaveSession}
        />
      )}

      {ui.toast && <Toast message={ui.toast} />}
    </div>
  );
}
