"use client";

import { useState, useEffect, useMemo, useReducer, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import type { CalendarEvent } from "@/types/calendar";
import { VerifiedName } from "@/components/verified-tag";
import {
  addMinutes,
  formatHour,
} from "@/lib/utils";
import {
  BOOKING_TIME_STEP_MINUTES,
  BOOKING_DAY_OVERFLOW_MINUTES,
  DEFAULT_DURATION,
  DEFAULT_DURATION_FILTER,
  isValidDuration,
  type DurationMin,
} from "@/constants/calendar";
import { formatLocalDate, formatLocalTimeRange } from "@/lib/localTime";
import { hasSessionStarted } from "@/lib/sessionWindow";
import { PageRefreshButton } from "@/components/page-refresh";
import {
  addDaysInTimeZone,
  minutesOfDayInTimeZone,
  startOfDayInTimeZone,
  wallMinutesOnDayToUtc,
  ymdInTimeZone,
} from "@/lib/zonedTime";
import { useUserTimezone } from "@/components/user-timezone-provider";
import { useCalendarSessions } from "@/hooks/useCalendarSessions";
import { useIsEngagementCrew } from "@/hooks/useIsEngagementCrew";
import { useCommunityModeration } from "@/hooks/useCommunityModeration";
import { buildEventsByDay } from "@/lib/calendarDayEvents";
import { BookingModal } from "../Calendar/Modals/BookingModal";
import { Toast } from "../Calendar/Modals/Toast";
import { ConfirmModal, partnerNoteField } from "../Calendar/Modals/ConfirmModal";
import { SessionDetailsModal } from "../Calendar/Modals/SessionDetailsModal";
import { HourOccupancyChip } from "../Calendar/HourOccupancyChip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  aggregateHourOccupancy,
  hoursWithMyPastMatchedSessions,
  isPastUnmatchedSession,
  occupancyKey,
} from "@/lib/calendarOccupancy";

const HOUR_HEIGHT = 60;
const OVERFLOW_HOURS = BOOKING_DAY_OVERFLOW_MINUTES / 60;
const GRID_HOURS = 24 + OVERFLOW_HOURS;
const BOOK_TIME_STEP_MINUTES = BOOKING_TIME_STEP_MINUTES;
const MAX_BOOK_MINUTES =
  24 * 60 - BOOK_TIME_STEP_MINUTES; /* 23:30 */

function formatBookTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function snapBookTimeMinutes(totalMinutes: number): number {
  const rounded =
    Math.round(totalMinutes / BOOK_TIME_STEP_MINUTES) * BOOK_TIME_STEP_MINUTES;
  return Math.min(Math.max(0, rounded), MAX_BOOK_MINUTES);
}

function getDefaultBookTime(date: Date, timeZone: string): string {
  const now = new Date();
  const isToday =
    ymdInTimeZone(date, timeZone) === ymdInTimeZone(now, timeZone);
  if (!isToday) return "09:00";

  const minutes = minutesOfDayInTimeZone(now, timeZone);
  const rounded = snapBookTimeMinutes(Math.ceil(minutes / BOOK_TIME_STEP_MINUTES) * BOOK_TIME_STEP_MINUTES);
  return formatBookTime(rounded);
}

function parseBookTime(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  if (minutes % BOOK_TIME_STEP_MINUTES !== 0) return null;
  return { hours, minutes };
}

function normalizeBookTime(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return formatBookTime(snapBookTimeMinutes(hours * 60 + minutes));
}

// ============================================
// Types & State Management (same as desktop)
// ============================================

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

interface UIState {
  startDate: Date;
  durationFilter: DurationMin[];
  createDuration: DurationMin;
  modal: ModalState;
  toast: string | null;
  sheetExpanded: boolean;
}

type UIAction =
  | { type: "SET_START_DATE"; date: Date }
  | { type: "SHIFT_DAY"; delta: number; timeZone: string }
  | { type: "GO_TODAY"; timeZone: string }
  | { type: "TOGGLE_DURATION_FILTER"; duration: DurationMin }
  | { type: "SET_CREATE_DURATION"; duration: DurationMin }
  | { type: "OPEN_BOOKING_MODAL"; event: CalendarEvent }
  | { type: "SET_BOOKING_QUIET"; quiet: boolean }
  | { type: "OPEN_DETAILS_MODAL"; event: CalendarEvent }
  | { type: "OPEN_CREATE_CONFIRM"; start: Date; preferred: DurationMin; whenLabel: string }
  | { type: "SET_CREATE_QUIET"; quiet: boolean }
  | { type: "OPEN_DELETE_CONFIRM"; event: CalendarEvent }
  | { type: "OPEN_LEAVE_CONFIRM"; event: CalendarEvent }
  | { type: "CLOSE_MODAL" }
  | { type: "SHOW_TOAST"; message: string }
  | { type: "CLEAR_TOAST" }
  | { type: "TOGGLE_SHEET" };

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_START_DATE":
      return { ...state, startDate: action.date };
    case "SHIFT_DAY":
      return {
        ...state,
        startDate: addDaysInTimeZone(state.startDate, action.delta, action.timeZone),
      };
    case "GO_TODAY":
      return {
        ...state,
        startDate: startOfDayInTimeZone(new Date(), action.timeZone),
      };
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
      return { ...state, modal: { type: "booking", event: action.event, quiet: false } };
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
      return { ...state, modal: { type: "confirm-delete", event: action.event } };
    case "OPEN_LEAVE_CONFIRM":
      return { ...state, modal: { type: "confirm-leave", event: action.event } };
    case "CLOSE_MODAL":
      return { ...state, modal: { type: "none" } };
    case "SHOW_TOAST":
      return { ...state, toast: action.message };
    case "CLEAR_TOAST":
      return { ...state, toast: null };
    case "TOGGLE_SHEET":
      return { ...state, sheetExpanded: !state.sheetExpanded };
    default:
      return state;
  }
}

function createInitialState(): UIState {
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC";
  return {
    startDate: startOfDayInTimeZone(new Date(), tz),
    durationFilter: DEFAULT_DURATION_FILTER,
    createDuration: DEFAULT_DURATION,
    modal: { type: "none" },
    toast: null,
    sheetExpanded: true,
  };
}

// ============================================
// Mobile Calendar Component
// ============================================

export default function MobileCalendar() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ui, dispatch] = useReducer(uiReducer, undefined, createInitialState);
  const { isCrew } = useIsEngagementCrew();

  useEffect(() => {
    if (isCrew && ui.createDuration === 25) {
      dispatch({ type: "SET_CREATE_DURATION", duration: 50 });
    }
  }, [isCrew, ui.createDuration]);
  const [now, setNow] = useState(new Date());
  const [bookTime, setBookTime] = useState("09:00");
  const { timeZone } = useUserTimezone();
  const { canBookSessions, bannedMessage } = useCommunityModeration();

  useEffect(() => {
    dispatch({ type: "GO_TODAY", timeZone });
  }, [timeZone]);

  useEffect(() => {
    setBookTime(getDefaultBookTime(ui.startDate, timeZone));
  }, [ui.startDate, timeZone]);

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
        // Keep local fallback defaults.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Need to import useState
  const days = useMemo(() => [ui.startDate], [ui.startDate]);

  // Toast auto-clear
  useEffect(() => {
    if (ui.toast) {
      const timer = setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2000);
      return () => clearTimeout(timer);
    }
  }, [ui.toast]);

  // Update now every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll timeline to a useful position when the day changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const today = new Date();
    const isToday =
      ymdInTimeZone(ui.startDate, timeZone) === ymdInTimeZone(today, timeZone);
    const scrollHour = isToday
      ? Math.max(0, Math.floor(minutesOfDayInTimeZone(today, timeZone) / 60) - 1)
      : 8;
    scrollRef.current.scrollTop = scrollHour * HOUR_HEIGHT;
  }, [ui.startDate, timeZone]);

  // Sessions hook
  const {
    events,
    occupied,
    currentUserId,
    createSession,
    deleteSession,
    leaveSession,
    joinSession,
    updateSessionMeta,
  } = useCalendarSessions({ days, onEventsChange: undefined, eventsProp: undefined });

  const hourOccupancy = useMemo(
    () => aggregateHourOccupancy(occupied, timeZone),
    [occupied, timeZone],
  );

  const myPastMatchedHours = useMemo(
    () => hoursWithMyPastMatchedSessions(events, currentUserId, timeZone, now),
    [events, currentUserId, timeZone, now],
  );

  // Filter and process events
  const eventsByDay = useMemo(
    () =>
      buildEventsByDay({
        days,
        events,
        timeZone,
        includeEvent: (ev) => {
          if (!ui.durationFilter.includes(ev.durationMin)) return false;
          if (isPastUnmatchedSession(ev, currentUserId)) return false;
          return true;
        },
      }),
    [days, events, ui.durationFilter, timeZone, currentUserId],
  );

  // Navigation
  const goToday = useCallback(
    () => dispatch({ type: "GO_TODAY", timeZone }),
    [timeZone],
  );
  const goNext = useCallback(
    () => dispatch({ type: "SHIFT_DAY", delta: 1, timeZone }),
    [timeZone],
  );
  const goPrev = useCallback(
    () => dispatch({ type: "SHIFT_DAY", delta: -1, timeZone }),
    [timeZone],
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

  // Update session meta
  const handleUpdateSessionMeta = useCallback(
    async (id: string, patch: { name?: string | null; color?: string | null }) => {
      try {
        await updateSessionMeta(id, patch);
        dispatch({ type: "SHOW_TOAST", message: "Session updated" });
      } catch (e) {
        dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
      }
    },
    [updateSessionMeta]
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

  // Leave flow
  const handleLeaveSession = useCallback(async (message?: string) => {
    if (ui.modal.type !== "confirm-leave") return;
    const { event } = ui.modal;
    dispatch({ type: "CLOSE_MODAL" });
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

  const handleBookFromPicker = useCallback(() => {
    if (!canBookSessions) {
      dispatch({ type: "SHOW_TOAST", message: bannedMessage });
      return;
    }

    const parsed = parseBookTime(bookTime);
    if (!parsed) {
      dispatch({
        type: "SHOW_TOAST",
        message: `Choose a valid time in ${BOOK_TIME_STEP_MINUTES}-minute intervals`,
      });
      return;
    }

    const snappedMinutes = parsed.hours * 60 + parsed.minutes;
    const start = wallMinutesOnDayToUtc(ui.startDate, snappedMinutes, timeZone);
    const nowDate = new Date();
    const nowMinutes = minutesOfDayInTimeZone(nowDate, timeZone);

    if (
      ymdInTimeZone(ui.startDate, timeZone) < ymdInTimeZone(nowDate, timeZone) ||
      (ymdInTimeZone(ui.startDate, timeZone) === ymdInTimeZone(nowDate, timeZone) &&
        snappedMinutes < nowMinutes)
    ) {
      dispatch({ type: "SHOW_TOAST", message: "Cannot create a session in the past" });
      return;
    }

    const startMs = start.getTime();
    const newEndMs = addMinutes(start, ui.createDuration).getTime();
    const overlaps = events.some((ev) => {
      const mine =
        (ev.owner_id && currentUserId && ev.owner_id === currentUserId) ||
        (ev.participants ?? []).some((p) => p.user_id === currentUserId);
      if (!mine) return false;
      const evStart = new Date(ev.start).getTime();
      const evEnd = new Date(ev.end).getTime();
      return startMs < evEnd && newEndMs > evStart;
    });

    if (overlaps) {
      dispatch({ type: "SHOW_TOAST", message: "You already have a session at this time" });
      return;
    }

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
  }, [
    canBookSessions,
    bannedMessage,
    bookTime,
    ui.startDate,
    ui.createDuration,
    timeZone,
    events,
    currentUserId,
  ]);

  // Format date
  const formatDate = (date: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      month: `${months[date.getMonth()]} ${date.getFullYear()}`,
      day: `${weekdays[date.getDay()]} ${date.getDate()}`,
    };
  };

  const dateInfo = formatDate(ui.startDate);
  const isToday =
    ymdInTimeZone(ui.startDate, timeZone) === ymdInTimeZone(new Date(), timeZone);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowLineTop = (nowMinutes / 60) * HOUR_HEIGHT;

  const formatNowTime = () => {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "p" : "a";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, "0")}${ampm}`;
  };

  const dayKey = ymdInTimeZone(ui.startDate, timeZone);
  const dayEvents = eventsByDay[dayKey] ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-1 text-lg font-semibold">
            {dateInfo.month}
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <PageRefreshButton compact />
            <button onClick={goPrev} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToday}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                isToday
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  : "bg-[#FFF1D3] dark:bg-[#5D1C6A]/35 text-[#5D1C6A]"
              }`}
            >
              Today
            </button>
            <button onClick={goNext} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Day label */}
      <div className="shrink-0 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 tracking-wide">
            {timeZone.replace(/_/g, " ")}
          </span>
          <span className={`text-sm font-medium ${isToday ? "text-[#5D1C6A]" : ""}`}>
            {dateInfo.day}
          </span>
        </div>
      </div>

      {/* Timeline Grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: ui.sheetExpanded ? 380 : 200 }}
      >
        <div className="relative" style={{ height: GRID_HOURS * HOUR_HEIGHT }}>
          {/* Hour lines */}
          {Array.from({ length: GRID_HOURS }).map((_, hour) => {
            const isOverflow = hour >= 24;
            const dayForOcc = isOverflow
              ? addDaysInTimeZone(ui.startDate, 1, timeZone)
              : ui.startDate;
            const hourForOcc = isOverflow ? hour - 24 : hour;
            const dayKey = ymdInTimeZone(dayForOcc, timeZone);
            const occ = hourOccupancy.get(occupancyKey(dayKey, hourForOcc));
            const hourEnd = wallMinutesOnDayToUtc(
              dayForOcc,
              (hourForOcc + 1) * 60,
              timeZone,
            );
            const tense =
              hourEnd.getTime() <= now.getTime() ? "attended" : "attending";
            const hideOccForMyPastMatch = myPastMatchedHours.has(
              occupancyKey(dayKey, hourForOcc),
            );
            return (
            <div
              key={hour}
              className={`absolute left-0 right-0 border-t ${
                isOverflow
                  ? "border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40"
                  : "border-gray-100 dark:border-gray-800"
              }`}
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <span
                className={`absolute left-3 -top-2.5 text-xs bg-white dark:bg-gray-900 px-1 ${
                  isOverflow ? "text-gray-300 dark:text-gray-600" : "text-gray-400"
                }`}
              >
                {formatHour(hourForOcc)}
                {isOverflow ? " +" : ""}
              </span>
              {occ && occ.total > 0 && !hideOccForMyPastMatch ? (
                <div className="pointer-events-none absolute right-2 top-1 z-[15]">
                  <HourOccupancyChip
                    people={occ.people}
                    total={occ.total}
                    tense={tense}
                  />
                </div>
              ) : null}
              {!isOverflow ? (
                <div className="absolute left-14 right-0 top-1/2 border-t border-dashed border-gray-100 dark:border-gray-800" />
              ) : null}
            </div>
            );
          })}

          {/* Now line */}
          {isToday && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowLineTop }}>
              <div className="flex items-center">
                <span className="text-xs font-medium text-red-500 bg-white dark:bg-gray-900 px-1">
                  {formatNowTime()}
                </span>
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            </div>
          )}

          {/* Events */}
          {dayEvents.map((ev) => {
            const top = (ev.startMinutes / 60) * HOUR_HEIGHT;
            const height = Math.max((ev.layoutDurationMin / 60) * HOUR_HEIGHT, 40);
            const isBooked = (ev.participants?.length ?? 0) >= 2;
            const isOwner = ev.owner_id === currentUserId;
            const isMySession = isBooked || isOwner;

            // Don't show other people's available slots if they overlap my session
            const mySessionsOnDay = dayEvents.filter(
              (e) =>
                (e.owner_id && currentUserId && e.owner_id === currentUserId) ||
                (e.participants ?? []).some((p) => p.user_id === currentUserId)
            );
            const ineligible =
              !isMySession &&
              mySessionsOnDay.some((e) => e.id !== ev.id && ev.startMs < e.endMs && ev.endMs > e.startMs);
            if (ineligible) return null;
            if (!isMySession && hasSessionStarted(ev.start)) return null;
            if (isPastUnmatchedSession(ev, currentUserId)) return null;

            const other = ev.participants?.find((p) => p.user_id !== currentUserId);
            const otherName = other
              ? [other.firstname, other.lastname].filter(Boolean).join(" ") || other.email?.split("@")[0]
              : null;
            const otherInitial = otherName?.[0]?.toUpperCase() || "?";
            const isPast = new Date(ev.end).getTime() < Date.now();
            const pastLabel = isBooked
              ? "Completed"
              : isOwner
                ? "Unmatched"
                : "Past session";

            return (
              <div
                key={ev.isContinuation ? `${ev.id}-cont` : ev.id}
                className={`absolute left-14 right-2 rounded-lg p-2 cursor-pointer transition-all ${
                  isPast
                    ? "border border-dashed border-gray-300 bg-gray-50/90 opacity-80 dark:border-gray-600 dark:bg-gray-900/70"
                    : isBooked
                    ? "bg-[#FFF1D3] dark:bg-[#5D1C6A]/35 border border-[#FFB090] dark:border-[#CA5995]/70"
                    : isOwner
                    ? "bg-[#FFB090]/35 dark:bg-[#5D1C6A]/45 border border-[#CA5995]/70 dark:border-[#CA5995]/70"
                    : "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-[#FFF1D3] dark:hover:bg-[#5D1C6A]/25"
                }`}
                style={{ top, height }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMySession) {
                    dispatch({ type: "OPEN_DETAILS_MODAL", event: ev });
                  } else if (!isPast) {
                    handleBookSlot(ev);
                  }
                }}
              >
                {isPast ? (
                  <div className="flex h-full items-center gap-2">
                    {isBooked && other ? (
                      <Avatar className="h-8 w-8 shrink-0 opacity-70 grayscale">
                        {other.avatar_url ? (
                          <AvatarImage src={other.avatar_url} alt={otherName || "Partner"} />
                        ) : null}
                        <AvatarFallback className="bg-gray-200 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {otherInitial}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                        <span className="text-[10px] font-medium text-gray-500">Done</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                        {pastLabel}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {ev.durationMin}m
                        {otherName ? ` · ${otherName}` : ""}
                      </p>
                    </div>
                  </div>
                ) : isBooked && other ? (
                  <div className="flex items-center gap-2 h-full">
                    <Avatar className="h-8 w-8 shrink-0">
                      {other.avatar_url ? (
                        <AvatarImage src={other.avatar_url} alt={otherName || "Partner"} />
                      ) : null}
                      <AvatarFallback className="text-xs bg-[#FFB090] dark:bg-[#5D1C6A]">
                        {otherInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        <VerifiedName
                          name={otherName}
                          verified={other?.emailVerified}
                        />
                      </p>
                      <p className="text-[10px] text-gray-500">{ev.durationMin}m session</p>
                    </div>
                  </div>
                ) : isOwner && !isBooked ? (
                  <div className="flex items-center gap-2 h-full">
                    <div className="h-8 w-8 rounded-full bg-[#FFB090]/60 dark:bg-[#5D1C6A] flex items-center justify-center shrink-0">
                      <span className="text-xs">⏳</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Waiting for match</p>
                      <p className="text-[10px] text-gray-500">{ev.durationMin}m</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 h-full">
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <span className="text-xs">👤</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Available slot</p>
                      <p className="text-[10px] text-gray-500">{ev.durationMin}m • Tap to join</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sheet - sits above mobile bottom nav */}
      <div
        className={`fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-t-2xl shadow-2xl transition-all duration-300 z-50 lg:bottom-0 ${
          ui.sheetExpanded ? "pb-4" : ""
        }`}
      >
        {/* Collapsed */}
        {!ui.sheetExpanded && (
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => dispatch({ type: "TOGGLE_SHEET" })}
              className="flex flex-1 items-center gap-3 text-left"
            >
              <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium dark:bg-gray-800">
                {bookTime}
              </span>
              <span className="text-sm text-gray-500">{ui.createDuration} min</span>
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "TOGGLE_SHEET" })}
              className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Expand session settings"
            >
              <ChevronUp className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Expanded */}
        {ui.sheetExpanded && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Book a session</h3>
              <button
                onClick={() => dispatch({ type: "TOGGLE_SHEET" })}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ChevronDown className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="mobile-book-time"
                className="text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                Start time
              </label>
              <input
                id="mobile-book-time"
                type="time"
                step={BOOK_TIME_STEP_MINUTES * 60}
                value={bookTime}
                onChange={(e) => {
                  const normalized = normalizeBookTime(e.target.value);
                  if (normalized) setBookTime(normalized);
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base dark:border-gray-700 dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500">
                Times are in {BOOK_TIME_STEP_MINUTES}-minute intervals for{" "}
                {dateInfo.day} in {timeZone.replace(/_/g, " ")}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([25, 50, 75] as DurationMin[]).map((d) => {
                  const blocked = isCrew && d === 25;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        !blocked &&
                        dispatch({ type: "SET_CREATE_DURATION", duration: d })
                      }
                      disabled={blocked}
                      title={
                        blocked ? "25-minute sessions are unavailable" : undefined
                      }
                      className={`py-3 rounded-lg text-center transition-all ${
                        blocked
                          ? "cursor-not-allowed bg-gray-100 text-gray-400 opacity-40 dark:bg-gray-800 dark:text-gray-600"
                          : ui.createDuration === d
                            ? "bg-[#5D1C6A] text-white font-semibold"
                            : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {d} min
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleBookFromPicker}
              className="w-full rounded-xl bg-[#5D1C6A] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#CA5995]"
            >
              Book session
            </button>

            <p className="text-center text-xs text-gray-500">
              Tap sessions on the timeline to join or manage them
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {ui.modal.type === "booking" && (
        <BookingModal
          event={ui.modal.event}
          onClose={() => dispatch({ type: "CLOSE_MODAL" })}
          quiet={ui.modal.quiet}
          onChangeQuiet={(quiet) => dispatch({ type: "SET_BOOKING_QUIET", quiet })}
          onConfirm={handleConfirmBooking}
        />
      )}

      {ui.modal.type === "details" && (() => {
        const { event } = ui.modal;
        const isBooked = (event.participants?.length ?? 0) >= 2;
        const isOwner = event.owner_id && currentUserId && event.owner_id === currentUserId;
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
                  onChange={(e) => dispatch({ type: "SET_CREATE_QUIET", quiet: e.target.checked })}
                />
                Quiet session (start muted)
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
          description="This action cannot be undone. Delete this session?"
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
          description="Leave this session? The slot will be available for someone else."
          confirmText="Leave"
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
