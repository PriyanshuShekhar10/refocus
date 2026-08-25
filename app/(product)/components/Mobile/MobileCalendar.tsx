"use client";

import {
  useState,
  useEffect,
  useMemo,
  useReducer,
  useCallback,
  useRef,
} from "react";
import { Plus } from "lucide-react";
import type { CalendarEvent } from "@/types/calendar";
import { addMinutes } from "@/lib/utils";
import {
  BOOKING_TIME_STEP_MINUTES,
  DEFAULT_DURATION,
  DEFAULT_DURATION_FILTER,
  isValidDuration,
  type DurationMin,
} from "@/constants/calendar";
import { formatLocalDate, formatLocalTimeRange } from "@/lib/localTime";
import { hasSessionStarted } from "@/lib/sessionWindow";
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
import { Toast } from "../Calendar/Modals/Toast";
import { ConfirmModal, partnerNoteField } from "../Calendar/Modals/ConfirmModal";
import { SessionDetailsModal } from "../Calendar/Modals/SessionDetailsModal";
import { MobileAgendaHeader } from "./MobileAgendaHeader";
import { MobileSessionCard } from "./MobileSessionCard";
import { MobileBookSheet, bookSheetDateLabel } from "./MobileBookSheet";
import { MobileSessionSheet } from "./MobileSessionSheet";
import {
  filterAgendaEvents,
  pickNextUpSession,
} from "./sessionUiState";
import { useMobileAgendaColors } from "./mobileAgendaColors";

const BOOK_TIME_STEP_MINUTES = BOOKING_TIME_STEP_MINUTES;
const MAX_BOOK_MINUTES = 24 * 60 - BOOK_TIME_STEP_MINUTES;
const SWIPE_THRESHOLD_PX = 50;

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
  const rounded = snapBookTimeMinutes(
    Math.ceil(minutes / BOOK_TIME_STEP_MINUTES) * BOOK_TIME_STEP_MINUTES,
  );
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

type ModalState =
  | { type: "none" }
  | {
      type: "confirm-create";
      start: Date;
      preferred: DurationMin;
      whenLabel: string;
      quiet: boolean;
    }
  | { type: "confirm-delete"; event: CalendarEvent }
  | { type: "confirm-leave"; event: CalendarEvent }
  | { type: "details"; event: CalendarEvent };

interface UIState {
  startDate: Date;
  durationFilter: DurationMin[];
  createDuration: DurationMin;
  modal: ModalState;
  toast: string | null;
  bookSheetOpen: boolean;
  sessionSheetEvent: CalendarEvent | null;
  joinQuiet: boolean;
}

type UIAction =
  | { type: "SET_START_DATE"; date: Date; timeZone: string }
  | { type: "SHIFT_DAY"; delta: number; timeZone: string }
  | { type: "GO_TODAY"; timeZone: string }
  | { type: "SET_CREATE_DURATION"; duration: DurationMin }
  | {
      type: "OPEN_CREATE_CONFIRM";
      start: Date;
      preferred: DurationMin;
      whenLabel: string;
    }
  | { type: "SET_CREATE_QUIET"; quiet: boolean }
  | { type: "OPEN_DELETE_CONFIRM"; event: CalendarEvent }
  | { type: "OPEN_LEAVE_CONFIRM"; event: CalendarEvent }
  | { type: "OPEN_DETAILS_MODAL"; event: CalendarEvent }
  | { type: "CLOSE_MODAL" }
  | { type: "SHOW_TOAST"; message: string }
  | { type: "CLEAR_TOAST" }
  | { type: "OPEN_BOOK_SHEET" }
  | { type: "CLOSE_BOOK_SHEET" }
  | { type: "OPEN_SESSION_SHEET"; event: CalendarEvent }
  | { type: "CLOSE_SESSION_SHEET" }
  | { type: "SET_JOIN_QUIET"; quiet: boolean };

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_START_DATE":
      return {
        ...state,
        startDate: startOfDayInTimeZone(action.date, action.timeZone),
      };
    case "SHIFT_DAY":
      return {
        ...state,
        startDate: addDaysInTimeZone(
          state.startDate,
          action.delta,
          action.timeZone,
        ),
      };
    case "GO_TODAY":
      return {
        ...state,
        startDate: startOfDayInTimeZone(new Date(), action.timeZone),
      };
    case "SET_CREATE_DURATION":
      return { ...state, createDuration: action.duration };
    case "OPEN_CREATE_CONFIRM":
      return {
        ...state,
        bookSheetOpen: false,
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
        sessionSheetEvent: null,
        modal: { type: "confirm-delete", event: action.event },
      };
    case "OPEN_LEAVE_CONFIRM":
      return {
        ...state,
        sessionSheetEvent: null,
        modal: { type: "confirm-leave", event: action.event },
      };
    case "OPEN_DETAILS_MODAL":
      return {
        ...state,
        sessionSheetEvent: null,
        modal: { type: "details", event: action.event },
      };
    case "CLOSE_MODAL":
      return { ...state, modal: { type: "none" } };
    case "SHOW_TOAST":
      return { ...state, toast: action.message };
    case "CLEAR_TOAST":
      return { ...state, toast: null };
    case "OPEN_BOOK_SHEET":
      return { ...state, bookSheetOpen: true };
    case "CLOSE_BOOK_SHEET":
      return { ...state, bookSheetOpen: false };
    case "OPEN_SESSION_SHEET":
      return {
        ...state,
        sessionSheetEvent: action.event,
        joinQuiet: false,
      };
    case "CLOSE_SESSION_SHEET":
      return { ...state, sessionSheetEvent: null };
    case "SET_JOIN_QUIET":
      return { ...state, joinQuiet: action.quiet };
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
    bookSheetOpen: false,
    sessionSheetEvent: null,
    joinQuiet: false,
  };
}

export default function MobileCalendar() {
  const agenda = useMobileAgendaColors();
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextUpRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [ui, dispatch] = useReducer(uiReducer, undefined, createInitialState);
  const { isCrew } = useIsEngagementCrew();
  const [now, setNow] = useState(new Date());
  const [bookTime, setBookTime] = useState("09:00");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const { timeZone } = useUserTimezone();
  const { canBookSessions, bannedMessage } = useCommunityModeration();

  useEffect(() => {
    if (isCrew && ui.createDuration === 25) {
      dispatch({ type: "SET_CREATE_DURATION", duration: 50 });
    }
  }, [isCrew, ui.createDuration]);

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
        if (
          !cancelled &&
          typeof preferred === "number" &&
          isValidDuration(preferred)
        ) {
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

  useEffect(() => {
    if (ui.toast) {
      const timer = setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2000);
      return () => clearTimeout(timer);
    }
  }, [ui.toast]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const days = useMemo(() => [ui.startDate], [ui.startDate]);

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
    onEventsChange: undefined,
    eventsProp: undefined,
  });

  const eventsByDay = useMemo(
    () =>
      buildEventsByDay({
        days,
        events,
        timeZone,
        includeEvent: (ev) => ui.durationFilter.includes(ev.durationMin),
      }),
    [days, events, ui.durationFilter, timeZone],
  );

  const dayKey = ymdInTimeZone(ui.startDate, timeZone);
  const agendaEvents = useMemo(() => {
    const raw = eventsByDay[dayKey] ?? [];
    return filterAgendaEvents(raw, currentUserId).sort(
      (a, b) => a.startMs - b.startMs,
    );
  }, [eventsByDay, dayKey, currentUserId]);

  const isToday =
    ymdInTimeZone(ui.startDate, timeZone) === ymdInTimeZone(now, timeZone);

  const nextUp = useMemo(
    () =>
      isToday ? pickNextUpSession(agendaEvents, currentUserId, now) : null,
    [isToday, agendaEvents, currentUserId, now],
  );

  const listEvents = useMemo(() => {
    if (!nextUp) return agendaEvents;
    return agendaEvents.filter((e) => e.id !== nextUp.id);
  }, [agendaEvents, nextUp]);

  useEffect(() => {
    if (!nextUpRef.current || !scrollRef.current) return;
    nextUpRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [dayKey, nextUp?.id]);

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
  const selectDate = useCallback(
    (date: Date) => dispatch({ type: "SET_START_DATE", date, timeZone }),
    [timeZone],
  );

  const openDatePicker = useCallback(() => {
    const el = datePickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      el.click();
    }
  }, []);

  const handleJoinFromSheet = useCallback(async () => {
    const event = ui.sessionSheetEvent;
    if (!event) return;
    if (hasSessionStarted(event.start)) {
      dispatch({
        type: "SHOW_TOAST",
        message: "This session has already started",
      });
      return;
    }
    try {
      await joinSession(event.id, ui.joinQuiet);
      dispatch({ type: "CLOSE_SESSION_SHEET" });
      dispatch({ type: "SHOW_TOAST", message: "Joined session" });
    } catch (e) {
      dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
    }
  }, [ui.sessionSheetEvent, ui.joinQuiet, joinSession]);

  const handleUpdateSessionMeta = useCallback(
    async (
      id: string,
      patch: { name?: string | null; color?: string | null },
    ) => {
      try {
        await updateSessionMeta(id, patch);
        dispatch({ type: "SHOW_TOAST", message: "Session updated" });
      } catch (e) {
        dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
      }
    },
    [updateSessionMeta],
  );

  const handleDeleteSession = useCallback(
    async (message?: string) => {
      if (ui.modal.type !== "confirm-delete") return;
      const { event } = ui.modal;
      try {
        await deleteSession(event.id, message);
      } catch (e) {
        dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
      }
    },
    [ui.modal, deleteSession],
  );

  const handleLeaveSession = useCallback(
    async (message?: string) => {
      if (ui.modal.type !== "confirm-leave") return;
      const { event } = ui.modal;
      dispatch({ type: "CLOSE_MODAL" });
      try {
        await leaveSession(event.id, message);
      } catch (e) {
        dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
      }
    },
    [ui.modal, leaveSession],
  );

  const handleCreateSession = useCallback(async () => {
    if (ui.modal.type !== "confirm-create") return;
    const { start, preferred, quiet } = ui.modal;
    try {
      const newId = await createSession(start, preferred, quiet);
      dispatch({ type: "CLOSE_MODAL" });
      setHighlightId(newId);
      dispatch({ type: "SHOW_TOAST", message: "Session booked" });
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
      (ymdInTimeZone(ui.startDate, timeZone) ===
        ymdInTimeZone(nowDate, timeZone) &&
        snappedMinutes < nowMinutes)
    ) {
      dispatch({
        type: "SHOW_TOAST",
        message: "Cannot create a session in the past",
      });
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
      dispatch({
        type: "SHOW_TOAST",
        message: "You already have a session at this time",
      });
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

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      if (!t) {
        touchStart.current = null;
        return;
      }
      const deltaX = t.clientX - touchStart.current.x;
      const deltaY = t.clientY - touchStart.current.y;
      touchStart.current = null;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
      if (deltaX < 0) goNext();
      else goPrev();
    },
    [goNext, goPrev],
  );

  const dayHeading = formatLocalDate(ui.startDate, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={{ backgroundColor: agenda.page, color: agenda.text }}
    >
      <MobileAgendaHeader
        startDate={ui.startDate}
        timeZone={timeZone}
        isToday={isToday}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onSelectDate={selectDate}
      />

      {/* Hidden date input for book-sheet date pick */}
      <input
        ref={datePickerRef}
        type="date"
        value={dayKey}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) return;
          const [y, m, d] = value.split("-").map(Number);
          if (!y || !m || !d) return;
          selectDate(new Date(y, m - 1, d, 12, 0, 0));
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-y-contain"
        style={{
          paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="px-4 pb-4 pt-3">
          <h2
            className="mb-3 text-sm font-semibold"
            style={{ color: agenda.textSecondary }}
          >
            {dayHeading}
          </h2>

          {nextUp && (
            <div ref={nextUpRef} className="mb-4">
              <MobileSessionCard
                event={nextUp}
                currentUserId={currentUserId}
                now={now}
                isNextUp
                highlighted={highlightId === nextUp.id}
                onPress={() =>
                  dispatch({ type: "OPEN_SESSION_SHEET", event: nextUp })
                }
              />
            </div>
          )}

          {listEvents.length === 0 && !nextUp ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm" style={{ color: agenda.textSecondary }}>
                No sessions on this day
              </p>
              <button
                type="button"
                onClick={() => dispatch({ type: "OPEN_BOOK_SHEET" })}
                className="min-h-11 rounded-xl px-5 text-sm font-semibold text-white transition-colors hover:bg-[#5F2066]"
                style={{ backgroundColor: agenda.plumCta }}
              >
                Book a session
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {listEvents.map((ev) => (
                <li key={ev.id}>
                  <MobileSessionCard
                    event={ev}
                    currentUserId={currentUserId}
                    now={now}
                    highlighted={highlightId === ev.id}
                    onPress={() =>
                      dispatch({ type: "OPEN_SESSION_SHEET", event: ev })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* FAB */}
      <div
        className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center px-4 lg:hidden"
        style={{
          bottom: "calc(4rem + env(safe-area-inset-bottom, 0px) + 0.5rem)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (!canBookSessions) {
              dispatch({ type: "SHOW_TOAST", message: bannedMessage });
              return;
            }
            dispatch({ type: "OPEN_BOOK_SHEET" });
          }}
          className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#5F2066] active:bg-[#5F2066]"
          style={{ backgroundColor: agenda.plumCta }}
        >
          <Plus className="h-5 w-5" aria-hidden />
          Book session
        </button>
      </div>

      <MobileBookSheet
        open={ui.bookSheetOpen}
        onClose={() => dispatch({ type: "CLOSE_BOOK_SHEET" })}
        dateLabel={bookSheetDateLabel(ui.startDate)}
        bookTime={bookTime}
        onBookTimeChange={(value) => {
          const normalized = normalizeBookTime(value);
          if (normalized) setBookTime(normalized);
        }}
        createDuration={ui.createDuration}
        onDurationChange={(d) =>
          dispatch({ type: "SET_CREATE_DURATION", duration: d })
        }
        block25={isCrew}
        timeStepMinutes={BOOK_TIME_STEP_MINUTES}
        onBook={handleBookFromPicker}
        onPickDate={openDatePicker}
      />

      <MobileSessionSheet
        open={Boolean(ui.sessionSheetEvent)}
        event={ui.sessionSheetEvent}
        currentUserId={currentUserId}
        quiet={ui.joinQuiet}
        onChangeQuiet={(quiet) => dispatch({ type: "SET_JOIN_QUIET", quiet })}
        onClose={() => dispatch({ type: "CLOSE_SESSION_SHEET" })}
        onJoin={handleJoinFromSheet}
        onLeave={() => {
          if (!ui.sessionSheetEvent) return;
          dispatch({
            type: "OPEN_LEAVE_CONFIRM",
            event: ui.sessionSheetEvent,
          });
        }}
        onManage={() => {
          if (!ui.sessionSheetEvent) return;
          dispatch({
            type: "OPEN_DETAILS_MODAL",
            event: ui.sessionSheetEvent,
          });
        }}
      />

      {ui.modal.type === "details" && (() => {
        const { event } = ui.modal;
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
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={ui.modal.quiet}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_CREATE_QUIET",
                      quiet: e.target.checked,
                    })
                  }
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
