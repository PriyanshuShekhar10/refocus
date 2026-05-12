"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent, FetchedSession } from "@/types/calendar";
import { toISO, addDays, addMinutes } from "@/lib/utils";
import { type DurationMin } from "@/constants/calendar";
import * as sessionsApi from "@/lib/api/sessionsApi";

// ============================================
// Types
// ============================================

interface UseCalendarSessionsOptions {
  /** Array of visible days */
  days: Date[];
  /** Callback when events change (for controlled mode) */
  onEventsChange?: (events: CalendarEvent[]) => void;
  /** External events (for controlled mode) */
  eventsProp?: CalendarEvent[];
}

interface UseCalendarSessionsReturn {
  /** Current list of events */
  events: CalendarEvent[];
  /** Set events (handles both controlled and uncontrolled modes) */
  setEvents: (
    next: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[]),
  ) => void;
  /** Current user ID */
  currentUserId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Create a new session */
  createSession: (
    start: Date,
    durationMin: DurationMin,
    quietOwner?: boolean,
  ) => Promise<void>;
  /** Delete a session (owner: deletes or transfers to other person if booked) */
  deleteSession: (id: string) => Promise<void>;
  /** Leave a session (participant only; session stays available for owner) */
  leaveSession: (id: string) => Promise<void>;
  /** Join/book a session */
  joinSession: (id: string, quiet?: boolean) => Promise<void>;
  /** Update session metadata (name, color) */
  updateSessionMeta: (
    id: string,
    patch: { name?: string | null; color?: string | null },
  ) => Promise<void>;
}

// ============================================
// Helpers
// ============================================

function mapFetchedToEvent(s: FetchedSession): CalendarEvent {
  return {
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
  };
}

// ============================================
// Hook Implementation
// ============================================

/**
 * useCalendarSessions - Manages session data and CRUD operations.
 *
 * Uses sessionsApi for all network calls. Implements optimistic updates
 * with revert + rethrow on failure so callers can show toasts/alerts.
 */
export function useCalendarSessions({
  days,
  onEventsChange,
  eventsProp,
}: UseCalendarSessionsOptions): UseCalendarSessionsReturn {
  const [internalEvents, setInternalEvents] = useState<CalendarEvent[]>(
    () => eventsProp ?? [],
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const events = eventsProp ?? internalEvents;

  const setEvents = useCallback(
    (next: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => {
      // Use functional form to get latest state (avoids stale closure)
      setInternalEvents((prev) => {
        const currentEvents = eventsProp ?? prev;
        const resolved = typeof next === "function" ? next(currentEvents) : next;
        if (onEventsChange) onEventsChange(resolved);
        // Only update internal state if not controlled
        return eventsProp ? prev : resolved;
      });
    },
    [onEventsChange, eventsProp],
  );

  // Fetch sessions when visible date range changes
  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      if (days.length === 0) return;

      setIsLoading(true);
      setError(null);

      const from = toISO(days[0]);
      const to = toISO(addDays(days[days.length - 1], 1));

      const result = await sessionsApi.list(from, to);

      if (cancelled) return;

      if (!result.ok) {
        console.error("/api/sessions failed", result.error);
        setError("Could not load sessions");
        setIsLoading(false);
        return;
      }

      setCurrentUserId(result.data.currentUserId ?? null);
      setEvents(result.data.sessions.map(mapFetchedToEvent));
      setIsLoading(false);
    }

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [days, refreshTrigger, setEvents]);

  // Real-time: subscribe to session updates via SSE (no polling)
  useEffect(() => {
    if (days.length === 0) return;

    const es = new EventSource("/api/events", { withCredentials: true });
    const onMessage = (e: MessageEvent<string>) => {
      try {
        const data = JSON.parse(e.data) as { type?: string; channel?: string };
        if (data.channel === "sessions" && data.type === "sessions_updated") {
          setRefreshTrigger((t) => t + 1);
        }
      } catch {
        // ignore non-JSON or parse errors
      }
    };

    es.onmessage = onMessage;
    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [days.length]);

  const createSession = useCallback(
    async (
      start: Date,
      durationMin: DurationMin,
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

      const result = await sessionsApi.create({
        start: optimistic.start,
        durationMin,
        sessionType: "focus",
        quietOwner,
      });

      if (!result.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== tempId));
        throw new sessionsApi.ApiError(result.error);
      }

      setEvents((prev) =>
        prev.map((e) => (e.id === tempId ? { ...e, id: result.data.id } : e)),
      );
    },
    [currentUserId, setEvents],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      const existing = events.find((e) => e.id === id);
      if (!existing) return;

      setEvents((prev) => prev.filter((e) => e.id !== id));

      const result = await sessionsApi.deleteSession(id);

      if (!result.ok) {
        setEvents((prev) => [...prev, existing]);
        throw new sessionsApi.ApiError(result.error);
      }
    },
    [events, setEvents],
  );

  const leaveSession = useCallback(
    async (id: string) => {
      const existing = events.find((e) => e.id === id);
      if (!existing) return;

      setEvents((prev) => prev.filter((e) => e.id !== id));

      const result = await sessionsApi.leave(id);

      if (!result.ok) {
        setEvents((prev) => [...prev, existing]);
        throw new sessionsApi.ApiError(result.error);
      }
    },
    [events, setEvents],
  );

  const joinSession = useCallback(
    async (id: string, quiet: boolean = false) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "booked" } : e)),
      );

      const result = await sessionsApi.join(id, quiet);

      if (!result.ok) {
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === id ? { ...ev, status: "available" } : ev,
          ),
        );
        throw new sessionsApi.ApiError(result.error);
      }
    },
    [setEvents],
  );

  const updateSessionMeta = useCallback(
    async (
      id: string,
      patch: { name?: string | null; color?: string | null },
    ) => {
      const result = await sessionsApi.patch(id, patch);

      if (!result.ok) {
        throw new sessionsApi.ApiError(result.error);
      }

      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [setEvents],
  );

  return {
    events,
    setEvents,
    currentUserId,
    isLoading,
    error,
    createSession,
    deleteSession,
    leaveSession,
    joinSession,
    updateSessionMeta,
  };
}

export default useCalendarSessions;
