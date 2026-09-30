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

const BOOK_SLOT_MINUTES = BOOKING_TIME_STEP_MINUTES;
const SWIPE_THRESHOLD_PX = 50;
const BOOK_SHEET_DAYS = 5;
const DAY_PARTS: Array<[label: string, from: number, to: number]> = [
  ["Morning", 0, 12 * 60],
  ["Afternoon", 12 * 60, 17 * 60],
  ["Evening", 17 * 60, 24 * 60],
];

function formatSlotLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "p" : "a"}`;
}

function formatClock(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
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
  const [ui, dispatch] = useReducer(uiReducer, undefined, createInitialState);
  const [now, setNow] = useState(new Date());
  const [bookMin, setBookMin] = useState<number | null>(null);
  const [bookPart, setBookPart] = useState<string | null>(null);
  const [bookQuiet, setBookQuiet] = useState(false);
  const [booking, setBooking] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const { timeZone } = useUserTimezone();
  const { canBookSessions, bannedMessage } = useCommunityModeration();

  useEffect(() => {
    if (ui.createDuration !== DEFAULT_DURATION) {
      dispatch({ type: "SET_CREATE_DURATION", duration: DEFAULT_DURATION });
    }
  }, [ui.createDuration]);

  useEffect(() => {
    dispatch({ type: "GO_TODAY", timeZone });
  }, [timeZone]);

  useEffect(() => {
    setBookMin(null);
    setBookPart(null);
  }, [ui.startDate]);

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

  // ── Book sheet: day chips, day parts, and 30-minute slots for the agenda day.
  const bookSlots = useMemo(() => {
    const todayMin = minutesOfDayInTimeZone(now, timeZone);
    const first = isToday
      ? Math.ceil((todayMin + 1) / BOOK_SLOT_MINUTES) * BOOK_SLOT_MINUTES
      : 0;
    const isMine = (ev: CalendarEvent) =>
      (ev.owner_id && currentUserId && ev.owner_id === currentUserId) ||
      (ev.participants ?? []).some((p) => p.user_id === currentUserId);
    const slots: Array<{
      minutes: number;
      label: string;
      busy: boolean;
      openWith: string | null;
      open: CalendarEvent | null;
    }> = [];
    for (let m = first; m < 24 * 60; m += BOOK_SLOT_MINUTES) {
      const start = wallMinutesOnDayToUtc(ui.startDate, m, timeZone).getTime();
      const end = start + DEFAULT_DURATION * 60_000;
      const busy = events.some(
        (ev) =>
          isMine(ev) &&
          start < new Date(ev.end).getTime() &&
          end > new Date(ev.start).getTime(),
      );
      const open =
        events.find(
          (ev) =>
            !isMine(ev) &&
            (ev.participants?.length ?? 0) < 2 &&
            ev.durationMin === DEFAULT_DURATION &&
            new Date(ev.start).getTime() === start &&
            start > Date.now(),
        ) ?? null;
      const host = open?.owner ?? open?.participants?.[0];
      const openWith = open
        ? (host?.firstname?.trim() || host?.username || "a partner")
        : null;
      slots.push({ minutes: m, label: formatSlotLabel(m), busy, openWith, open });
    }
    return slots;
  }, [events, currentUserId, ui.startDate, timeZone, isToday, now]);

  const firstFreeSlot = bookSlots.find((s) => !s.busy)?.minutes ?? null;
  const selectedSlot =
    bookSlots.find((s) => s.minutes === bookMin && !s.busy) ??
    bookSlots.find((s) => s.minutes === firstFreeSlot) ??
    null;
  const activePart =
    DAY_PARTS.find(
      ([label, from, to]) =>
        label === bookPart && bookSlots.some((s) => s.minutes >= from && s.minutes < to),
    ) ??
    DAY_PARTS.find(
      ([, from, to]) =>
        selectedSlot && selectedSlot.minutes >= from && selectedSlot.minutes < to,
    ) ??
    DAY_PARTS[1];

  const sheetDays = useMemo(() => {
    const today = startOfDayInTimeZone(now, timeZone);
    return Array.from({ length: BOOK_SHEET_DAYS }, (_, i) => {
      const date = addDaysInTimeZone(today, i, timeZone);
      const key = ymdInTimeZone(date, timeZone);
      return {
        key,
        label:
          i === 0
            ? "Today"
            : i === 1
              ? "Tomorrow"
              : formatLocalDate(date, { weekday: "short", day: "numeric" }),
        date,
      };
    });
  }, [now, timeZone]);

  const sheetDayLabel =
    sheetDays.find((d) => d.key === dayKey)?.label ?? bookSheetDateLabel(ui.startDate);

  const handleBookFromSheet = useCallback(async () => {
    if (!canBookSessions) {
      dispatch({ type: "SHOW_TOAST", message: bannedMessage });
      return;
    }
    if (!selectedSlot || booking) return;
    setBooking(true);
    try {
      if (selectedSlot.open) {
        if (hasSessionStarted(selectedSlot.open.start)) {
          dispatch({ type: "SHOW_TOAST", message: "This session has already started" });
          return;
        }
        await joinSession(selectedSlot.open.id, bookQuiet);
        dispatch({ type: "CLOSE_BOOK_SHEET" });
        setHighlightId(selectedSlot.open.id);
        dispatch({ type: "SHOW_TOAST", message: "Joined session" });
      } else {
        const start = wallMinutesOnDayToUtc(ui.startDate, selectedSlot.minutes, timeZone);
        const newId = await createSession(start, DEFAULT_DURATION, bookQuiet);
        dispatch({ type: "CLOSE_BOOK_SHEET" });
        setHighlightId(newId);
        dispatch({ type: "SHOW_TOAST", message: "Session booked" });
      }
      setBookQuiet(false);
    } catch (e) {
      dispatch({ type: "SHOW_TOAST", message: (e as Error).message });
    } finally {
      setBooking(false);
    }
  }, [
    canBookSessions,
    bannedMessage,
    selectedSlot,
    booking,
    joinSession,
    createSession,
    bookQuiet,
    ui.startDate,
    timeZone,
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

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-y-contain"
        style={{
          paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto max-w-[560px] px-4 pb-4 pt-3">
          <h2
            className="mb-3 text-[13.5px] font-semibold"
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
                className="min-h-11 rounded-xl px-5 text-sm font-semibold bg-rf-primary text-rf-on-primary transition-colors hover:bg-rf-primary-hover"
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
          className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold bg-rf-primary text-rf-on-primary shadow-[0_8px_24px_rgba(0,0,0,.2)] transition-colors hover:bg-rf-primary-hover active:bg-rf-primary-hover"
        >
          <Plus className="h-5 w-5" aria-hidden />
          Book session
        </button>
      </div>

      <MobileBookSheet
        open={ui.bookSheetOpen}
        onClose={() => dispatch({ type: "CLOSE_BOOK_SHEET" })}
        days={sheetDays.map((d) => ({
          key: d.key,
          label: d.label,
          selected: d.key === dayKey,
          pick: () => selectDate(d.date),
        }))}
        parts={DAY_PARTS.map(([label, from, to]) => ({
          label,
          selected: activePart[0] === label,
          disabled: !bookSlots.some((s) => s.minutes >= from && s.minutes < to),
          pick: () => {
            setBookPart(label);
            setBookMin(null);
          },
        }))}
        slots={bookSlots.filter(
          (s) => s.minutes >= activePart[1] && s.minutes < activePart[2],
        )}
        selectedMinutes={selectedSlot?.minutes ?? null}
        onSelectSlot={setBookMin}
        quiet={bookQuiet}
        onToggleQuiet={() => setBookQuiet((v) => !v)}
        summary={
          selectedSlot
            ? `${sheetDayLabel} · ${formatClock(selectedSlot.minutes)} – ${formatClock(
                selectedSlot.minutes + DEFAULT_DURATION,
              )}${bookQuiet ? " · Quiet" : ""}`
            : sheetDayLabel
        }
        onBook={() => void handleBookFromSheet()}
        booking={booking}
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
              <label className="flex items-center gap-3 text-sm text-rf-ink-soft">
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
