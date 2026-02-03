"use client";

import { useState, useEffect, useMemo, useReducer, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import type { CalendarEvent } from "@/types/calendar";
import {
  startOfDay,
  addMinutes,
  addDays,
  ymd,
  formatHour,
} from "@/lib/utils";
import {
  TIME_CONFIG,
  DEFAULT_DURATION,
  DEFAULT_DURATION_FILTER,
  type DurationMin,
} from "@/constants/calendar";
import { useCalendarSessions } from "@/hooks/useCalendarSessions";
import { BookingModal } from "../Calendar/Modals/BookingModal";
import { Toast } from "../Calendar/Modals/Toast";
import { ConfirmModal } from "../Calendar/Modals/ConfirmModal";
import { SessionDetailsModal } from "../Calendar/Modals/SessionDetailsModal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const HOUR_HEIGHT = 60;
const STEP_MINUTES = 15;

// ============================================
// Types & State Management (same as desktop)
// ============================================

type ProcessedEvent = CalendarEvent & {
  startMs: number;
  endMs: number;
  startMinutes: number;
};

type ModalState =
  | { type: "none" }
  | { type: "booking"; event: CalendarEvent; quiet: boolean }
  | { type: "details"; event: CalendarEvent }
  | {
      type: "confirm-create";
      start: Date;
      preferred: DurationMin;
      whenIst: string;
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
  | { type: "SHIFT_DAY"; delta: number }
  | { type: "GO_TODAY" }
  | { type: "TOGGLE_DURATION_FILTER"; duration: DurationMin }
  | { type: "SET_CREATE_DURATION"; duration: DurationMin }
  | { type: "OPEN_BOOKING_MODAL"; event: CalendarEvent }
  | { type: "SET_BOOKING_QUIET"; quiet: boolean }
  | { type: "OPEN_DETAILS_MODAL"; event: CalendarEvent }
  | { type: "OPEN_CREATE_CONFIRM"; start: Date; preferred: DurationMin; whenIst: string }
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
      return { ...state, startDate: startOfDay(action.date) };
    case "SHIFT_DAY":
      return { ...state, startDate: addDays(state.startDate, action.delta) };
    case "GO_TODAY":
      return { ...state, startDate: startOfDay(new Date()) };
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
          whenIst: action.whenIst,
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
  return {
    startDate: startOfDay(new Date()),
    durationFilter: DEFAULT_DURATION_FILTER,
    createDuration: DEFAULT_DURATION,
    modal: { type: "none" },
    toast: null,
    sheetExpanded: false,
  };
}

// ============================================
// Mobile Calendar Component
// ============================================

export default function MobileCalendar() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ui, dispatch] = useReducer(uiReducer, undefined, createInitialState);
  const [now, setNow] = useState(new Date());

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

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const currentHour = new Date().getHours();
      scrollRef.current.scrollTop = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
    }
  }, []);

  // Sessions hook
  const {
    events,
    currentUserId,
    createSession,
    deleteSession,
    leaveSession,
    joinSession,
    updateSessionMeta,
  } = useCalendarSessions({ days, onEventsChange: undefined, eventsProp: undefined });

  // Filter and process events
  const eventsByDay = useMemo(() => {
    const map: Record<string, ProcessedEvent[]> = {};
    for (const d of days) map[ymd(d)] = [];

    const filtered = events.filter((ev) => ui.durationFilter.includes(ev.durationMin));

    for (const ev of filtered) {
      const startMs = new Date(ev.start).getTime();
      const endMs = new Date(ev.end).getTime();
      const evStartDate = new Date(startMs);
      const startMinutes = evStartDate.getHours() * 60 + evStartDate.getMinutes();
      const key = ymd(evStartDate);

      if (map[key]) {
        map[key].push({ ...ev, startMs, endMs, startMinutes });
      }
    }

    for (const k in map) {
      map[k].sort((a, b) => a.startMs - b.startMs);
    }

    return map;
  }, [days, events, ui.durationFilter]);

  // Navigation
  const goToday = useCallback(() => dispatch({ type: "GO_TODAY" }), []);
  const goNext = useCallback(() => dispatch({ type: "SHIFT_DAY", delta: 1 }), []);
  const goPrev = useCallback(() => dispatch({ type: "SHIFT_DAY", delta: -1 }), []);

  // Booking flow
  const handleBookSlot = useCallback(
    (event: CalendarEvent) => dispatch({ type: "OPEN_BOOKING_MODAL", event }),
    []
  );

  const handleConfirmBooking = useCallback(async () => {
    if (ui.modal.type !== "booking") return;
    const { event, quiet } = ui.modal;
    dispatch({ type: "CLOSE_MODAL" });
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
  const handleDeleteSession = useCallback(async () => {
    if (ui.modal.type !== "confirm-delete") return;
    const { event } = ui.modal;
    dispatch({ type: "CLOSE_MODAL" });
    try {
      await deleteSession(event.id);
    } catch (e) {
      dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
    }
  }, [ui.modal, deleteSession]);

  // Leave flow
  const handleLeaveSession = useCallback(async () => {
    if (ui.modal.type !== "confirm-leave") return;
    const { event } = ui.modal;
    dispatch({ type: "CLOSE_MODAL" });
    try {
      await leaveSession(event.id);
    } catch (e) {
      dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
    }
  }, [ui.modal, leaveSession]);

  // Create flow
  const handleCreateSession = useCallback(async () => {
    if (ui.modal.type !== "confirm-create") return;
    const { start, preferred, quiet } = ui.modal;
    dispatch({ type: "CLOSE_MODAL" });
    try {
      await createSession(start, preferred, quiet);
    } catch (e) {
      dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
    }
  }, [ui.modal, createSession]);

  // Grid click handler
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop || 0);
    const totalMinutes = (y / HOUR_HEIGHT) * 60;
    const snappedMinutes = Math.floor(totalMinutes / STEP_MINUTES) * STEP_MINUTES;
    const hour = Math.floor(snappedMinutes / 60);
    const minute = snappedMinutes % 60;

    const start = new Date(ui.startDate);
    start.setHours(hour, minute, 0, 0);

    const nowDate = new Date();
    const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

    // Prevent creating sessions in the past
    if (ymd(ui.startDate) < ymd(nowDate) || (ymd(ui.startDate) === ymd(nowDate) && snappedMinutes < nowMinutes)) {
      dispatch({ type: "SHOW_TOAST", message: "Cannot create a session in the past" });
      return;
    }

    // Check for overlaps with my sessions
    const dayKey = ymd(ui.startDate);
    const startMs = start.getTime();
    const newEndMs = addMinutes(start, ui.createDuration).getTime();
    const mySessions = (eventsByDay[dayKey] ?? []).filter(
      (ev) =>
        (ev.owner_id && currentUserId && ev.owner_id === currentUserId) ||
        (ev.participants ?? []).some((p) => p.user_id === currentUserId)
    );
    const overlaps = mySessions.some((ev) => startMs < ev.endMs && newEndMs > ev.startMs);

    if (overlaps) {
      dispatch({ type: "SHOW_TOAST", message: "You already have a session at this time" });
      return;
    }

    const whenIst = start.toLocaleString(TIME_CONFIG.locale, { timeZone: TIME_CONFIG.timezone });
    dispatch({ type: "OPEN_CREATE_CONFIRM", start, preferred: ui.createDuration, whenIst });
  };

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
  const isToday = ymd(ui.startDate) === ymd(new Date());
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowLineTop = (nowMinutes / 60) * HOUR_HEIGHT;

  const formatNowTime = () => {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "p" : "a";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, "0")}${ampm}`;
  };

  const dayKey = ymd(ui.startDate);
  const dayEvents = eventsByDay[dayKey] ?? [];

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-1 text-lg font-semibold">
            {dateInfo.month}
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToday}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                isToday
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  : "bg-green-100 dark:bg-green-900/30 text-green-600"
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
          <span className="text-xs text-gray-500 uppercase tracking-wide">IST</span>
          <span className={`text-sm font-medium ${isToday ? "text-green-600" : ""}`}>
            {dateInfo.day}
          </span>
        </div>
      </div>

      {/* Timeline Grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: ui.sheetExpanded ? 340 : 140 }}
      >
        <div className="relative" style={{ height: 24 * HOUR_HEIGHT }} onClick={handleGridClick}>
          {/* Hour lines */}
          {Array.from({ length: 24 }).map((_, hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <span className="absolute left-3 -top-2.5 text-xs text-gray-400 bg-white dark:bg-gray-900 px-1">
                {formatHour(hour)}
              </span>
              <div className="absolute left-14 right-0 top-1/4 border-t border-dashed border-gray-100 dark:border-gray-800" />
              <div className="absolute left-14 right-0 top-1/2 border-t border-dashed border-gray-100 dark:border-gray-800" />
              <div className="absolute left-14 right-0 top-3/4 border-t border-dashed border-gray-100 dark:border-gray-800" />
            </div>
          ))}

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
            const height = Math.max((ev.durationMin / 60) * HOUR_HEIGHT, 40);
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

            const other = ev.participants?.find((p) => p.user_id !== currentUserId);
            const otherName = other
              ? [other.firstname, other.lastname].filter(Boolean).join(" ") || other.email?.split("@")[0]
              : null;
            const otherInitial = otherName?.[0]?.toUpperCase() || "?";

            return (
              <div
                key={ev.id}
                className={`absolute left-14 right-2 rounded-lg p-2 cursor-pointer transition-all ${
                  isBooked
                    ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
                    : isOwner
                    ? "bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700"
                    : "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                }`}
                style={{ top, height }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMySession) {
                    dispatch({ type: "OPEN_DETAILS_MODAL", event: ev });
                  } else {
                    handleBookSlot(ev);
                  }
                }}
              >
                {isBooked && other ? (
                  <div className="flex items-center gap-2 h-full">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-green-200 dark:bg-green-800">
                        {otherInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{otherName}</p>
                      <p className="text-[10px] text-gray-500">{ev.durationMin}m session</p>
                    </div>
                  </div>
                ) : isOwner && !isBooked ? (
                  <div className="flex items-center gap-2 h-full">
                    <div className="h-8 w-8 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center shrink-0">
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

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-t-2xl shadow-2xl transition-all duration-300 z-40 ${
          ui.sheetExpanded ? "pb-4" : ""
        }`}
      >
        {/* Collapsed */}
        {!ui.sheetExpanded && (
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium">
                {ui.createDuration}m
              </span>
              <div className="flex gap-1">
                {([25, 50, 75] as DurationMin[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => dispatch({ type: "SET_CREATE_DURATION", duration: d })}
                    className={`w-2 h-2 rounded-full ${
                      ui.createDuration === d ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: "TOGGLE_SHEET" })}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronUp className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Expanded */}
        {ui.sheetExpanded && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Session Settings</h3>
              <button
                onClick={() => dispatch({ type: "TOGGLE_SHEET" })}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ChevronDown className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Create Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Session Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([25, 50, 75] as DurationMin[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => dispatch({ type: "SET_CREATE_DURATION", duration: d })}
                    className={`py-3 rounded-lg text-center transition-all ${
                      ui.createDuration === d
                        ? "bg-green-600 text-white font-semibold"
                        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Show Sessions
              </label>
              <div className="flex gap-2">
                {([25, 50, 75] as DurationMin[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => dispatch({ type: "TOGGLE_DURATION_FILTER", duration: d })}
                    className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                      ui.durationFilter.includes(d)
                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Tap on the timeline to create a session
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
                Create a <strong>{ui.modal.preferred}-minute</strong> session at
                <br />
                <strong>{ui.modal.whenIst} (IST)</strong>?
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
          onCancel={() => dispatch({ type: "CLOSE_MODAL" })}
          onConfirm={handleLeaveSession}
        />
      )}

      {ui.toast && <Toast message={ui.toast} />}
    </div>
  );
}
