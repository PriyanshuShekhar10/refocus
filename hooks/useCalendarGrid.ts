"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEvent } from "@/types/calendar";
import { startOfDay, addDays, ymd, clamp, minutesBetween } from "@/lib/utils";
import {
  CALENDAR_LAYOUT,
  TIME_CONFIG,
  type DurationMin,
} from "@/constants/calendar";

// ============================================
// Types
// ============================================

export interface HoverState {
  /** Index of the day column being hovered */
  dayIndex: number;
  /** Y position in pixels (snapped to grid) */
  yPx: number;
  /** Time label (e.g., "14:30") */
  label: string;
  /** Top position for preview slot */
  previewTop: number;
  /** Whether cursor is over an existing event */
  overEvent: boolean;
}

interface UseCalendarGridOptions {
  /** Array of visible days */
  days: Date[];
  /** Start hour of the calendar (0-23) */
  startHour: number;
  /** End hour of the calendar (0-24) */
  endHour: number;
  /** Step in minutes for grid snapping */
  stepMinutes: number;
  /** Number of visible days */
  visibleDays: number;
  /** Currently selected duration for creating sessions */
  createDuration: DurationMin;
  /** Events organized by day (for overlap detection) */
  eventsByDay: Record<string, CalendarEvent[]>;
}

interface UseCalendarGridReturn {
  /** Ref to attach to the grid container */
  gridRef: React.RefObject<HTMLDivElement | null>;
  /** Current hover state */
  hoverState: HoverState | null;
  /** Current time for "now" line */
  now: Date;
  /** Y position of the "now" line (null if not visible) */
  nowLine: number | null;
  /** Convert minutes to pixels */
  minuteToPx: (minutes: number) => number;
  /** Total minutes in the visible range */
  totalMinutes: number;
  /** Handler for grid click events */
  handleGridClick: (
    e: React.MouseEvent<HTMLDivElement>,
  ) => { dayDate: Date; start: Date; minutesOfDay: number } | null;
  /** Handler for grid mouse move events */
  handleGridMouseMove: React.MouseEventHandler<HTMLDivElement>;
  /** Handler for grid mouse leave events */
  handleGridMouseLeave: () => void;
  /** Handler for grid scroll events */
  handleGridScroll: React.UIEventHandler<HTMLDivElement>;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * useCalendarGrid - Manages grid calculations, hover state, and scroll behavior.
 *
 * Handles:
 * - Time-to-pixel conversions using centralized layout config
 * - Hover state with snapping to grid intervals
 * - "Now" line positioning
 * - Auto-scroll to current time
 * - Grid click position calculations
 *
 * @example
 * ```tsx
 * const {
 *   gridRef,
 *   hoverState,
 *   nowLine,
 *   handleGridClick,
 *   handleGridMouseMove,
 * } = useCalendarGrid({
 *   days,
 *   startHour: 0,
 *   endHour: 24,
 *   stepMinutes: 15,
 *   visibleDays: 3,
 *   createDuration: 25,
 *   eventsByDay,
 * });
 * ```
 */
export function useCalendarGrid({
  days,
  startHour,
  endHour,
  stepMinutes,
  visibleDays,
  createDuration,
  eventsByDay,
}: UseCalendarGridOptions): UseCalendarGridReturn {
  const { rowPx, gutterWidth } = CALENDAR_LAYOUT;
  const totalMinutes = (endHour - startHour) * 60;

  // Current time state (updates every minute)
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Grid container ref
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Track last mouse position for scroll-based hover updates
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  // Track which date range we've auto-scrolled for
  const autoScrolledKeyRef = useRef<string | null>(null);

  // Hover state
  const [hoverState, setHoverState] = useState<HoverState | null>(null);

  // Convert minutes to pixels
  const minuteToPx = useCallback(
    (m: number) => (m / stepMinutes) * rowPx,
    [stepMinutes, rowPx],
  );

  // Calculate "now" line position
  const nowLine = useMemo(() => {
    const day0 = days[0];
    const dayLast = days[days.length - 1];
    if (!day0 || !dayLast) return null;

    const n = now;
    if (n < startOfDay(day0) || n > addDays(startOfDay(dayLast), 1)) {
      return null;
    }

    const m = n.getHours() * 60 + n.getMinutes() - startHour * 60;
    return clamp(minuteToPx(m), 0, minuteToPx(totalMinutes));
  }, [days, now, startHour, totalMinutes, minuteToPx]);

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

  // Compute hover state from client coordinates
  const computeHoverFromClient = useCallback(
    (clientX: number, clientY: number) => {
      if (!gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const scroller = gridRef.current;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const contentWidth = Math.max(0, rect.width - gutterWidth);
      const xAdjusted = Math.max(0, x - gutterWidth);
      const dayWidth = contentWidth / visibleDays;
      const dayIndex = clamp(
        Math.floor(xAdjusted / dayWidth),
        0,
        visibleDays - 1,
      );

      const yContent = y + (scroller?.scrollTop ?? 0);
      const minutesFromTopRaw = (yContent / rowPx) * stepMinutes;
      const minutesFromTop =
        Math.round(minutesFromTopRaw / stepMinutes) * stepMinutes;
      const minutesOfDay = clamp(
        minutesFromTop + startHour * 60,
        startHour * 60,
        endHour * 60 - createDuration,
      );

      const d = days[dayIndex];
      if (!d) return;

      const when = new Date(startOfDay(d));
      when.setMinutes(minutesOfDay);

      const label = when.toLocaleTimeString(TIME_CONFIG.locale, {
        ...TIME_CONFIG.timeFormatOptions,
        timeZone: TIME_CONFIG.timezone,
      });

      // Check if cursor is over an existing event
      const dayKey = ymd(d);
      const overEvent = (eventsByDay[dayKey] ?? []).some((ev) => {
        const s = new Date(ev.start);
        const startMin = minutesBetween(startOfDay(s), s);
        const endMin = startMin + ev.durationMin;
        return minutesOfDay >= startMin && minutesOfDay < endMin;
      });

      const topPx = minuteToPx(minutesOfDay - startHour * 60);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      // Hide hover for past times
      if (
        ymd(d) < ymd(now) ||
        (ymd(d) === ymd(now) && minutesOfDay < nowMinutes)
      ) {
        setHoverState(null);
        return;
      }

      setHoverState({
        dayIndex,
        yPx: topPx,
        label,
        previewTop: topPx,
        overEvent,
      });
    },
    [
      days,
      startHour,
      endHour,
      stepMinutes,
      visibleDays,
      createDuration,
      eventsByDay,
      now,
      gutterWidth,
      rowPx,
      minuteToPx,
    ],
  );

  // Calculate click position and return day/time info
  const handleGridClick = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
    ): { dayDate: Date; start: Date; minutesOfDay: number } | null => {
      if (!gridRef.current) return null;

      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const contentWidth = Math.max(0, rect.width - gutterWidth);
      const xAdjusted = Math.max(0, x - gutterWidth);
      const dayWidth = contentWidth / visibleDays;
      const dayIndex = clamp(
        Math.floor(xAdjusted / dayWidth),
        0,
        visibleDays - 1,
      );
      const dayDate = days[dayIndex];

      if (!dayDate) return null;

      const scroller = gridRef.current;
      const y = e.clientY - rect.top;
      const yContent = y + (scroller?.scrollTop ?? 0);
      const minutesFromTop = Math.round(yContent / rowPx) * stepMinutes;
      const minutesOfDay = clamp(
        minutesFromTop + startHour * 60,
        startHour * 60,
        endHour * 60 - createDuration,
      );

      const start = new Date(startOfDay(dayDate));
      start.setMinutes(minutesOfDay);

      return { dayDate, start, minutesOfDay };
    },
    [
      days,
      startHour,
      endHour,
      stepMinutes,
      visibleDays,
      createDuration,
      gutterWidth,
      rowPx,
    ],
  );

  const handleGridMouseMove: React.MouseEventHandler<HTMLDivElement> =
    useCallback(
      (e) => {
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        computeHoverFromClient(e.clientX, e.clientY);
      },
      [computeHoverFromClient],
    );

  const handleGridMouseLeave = useCallback(() => {
    setHoverState(null);
    lastMousePos.current = null;
  }, []);

  const handleGridScroll: React.UIEventHandler<HTMLDivElement> =
    useCallback(() => {
      if (!lastMousePos.current) {
        setHoverState(null);
        return;
      }
      computeHoverFromClient(lastMousePos.current.x, lastMousePos.current.y);
    }, [computeHoverFromClient]);

  return {
    gridRef,
    hoverState,
    now,
    nowLine,
    minuteToPx,
    totalMinutes,
    handleGridClick,
    handleGridMouseMove,
    handleGridMouseLeave,
    handleGridScroll,
  };
}

export default useCalendarGrid;
