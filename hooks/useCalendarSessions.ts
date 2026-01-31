"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent, FetchedSession } from "@/types/calendar";
import { toISO, addDays, addMinutes } from "@/lib/utils";
import { type DurationMin } from "@/constants/calendar";

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
  /** Delete a session */
  deleteSession: (id: string) => Promise<void>;
  /** Join/book a session */
  joinSession: (id: string, quiet?: boolean) => Promise<void>;
  /** Update session metadata (name, color) */
  updateSessionMeta: (
    id: string,
    patch: { name?: string | null; color?: string | null },
  ) => Promise<void>;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * useCalendarSessions - Manages session data and CRUD operations.
 *
 * Handles:
 * - Fetching sessions from API based on visible date range
 * - Creating, deleting, and joining sessions
 * - Optimistic updates with rollback on failure
 * - Both controlled and uncontrolled modes
 *
 * @example
 * ```tsx
 * const {
 *   events,
 *   createSession,
 *   deleteSession,
 *   joinSession,
 * } = useCalendarSessions({ days });
 * ```
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

  // Use external events if provided, otherwise use internal state
  const events = eventsProp ?? internalEvents;

  // Unified setter that handles both controlled and uncontrolled modes
  const setEvents = useCallback(
    (next: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => {
      if (onEventsChange) {
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

  // Fetch sessions when visible date range changes
  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      if (days.length === 0) return;

      setIsLoading(true);
      setError(null);

      const from = toISO(days[0]);
      const to = toISO(addDays(days[days.length - 1], 1));

      try {
        const res = await fetch(
          `/api/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        );

        let data: unknown = null;
        try {
          data = await res.json();
        } catch {
          // JSON parse failed
        }

        if (!res.ok) {
          const errMsg =
            (data as { error?: string } | null)?.error || res.statusText;
          console.error("/api/sessions failed", errMsg);
          setError("Could not load sessions");
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
        setError("Failed to fetch sessions");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, [days]);

  // Create a new session
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

        if (!res.ok) {
          throw new Error(data.error || "Failed to create session");
        }

        setEvents((prev) =>
          prev.map((e) => (e.id === tempId ? { ...e, id: data.id } : e)),
        );
      } catch (e) {
        // Rollback on failure
        setEvents((prev) => prev.filter((e) => e.id !== tempId));
        throw e;
      }
    },
    [currentUserId, setEvents],
  );

  // Delete a session
  const deleteSession = useCallback(
    async (id: string) => {
      const existing = events.find((e) => e.id === id);
      if (!existing) return;

      // Optimistic delete
      setEvents((prev) => prev.filter((e) => e.id !== id));

      try {
        const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to delete session");
        }
      } catch (e) {
        // Rollback on failure
        setEvents((prev) => [...prev, existing]);
        throw e;
      }
    },
    [events, setEvents],
  );

  // Join/book a session
  const joinSession = useCallback(
    async (id: string, quiet: boolean = false) => {
      // Optimistic update
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "booked" } : e)),
      );

      try {
        const res = await fetch(`/api/sessions/${id}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quiet }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to join session");
        }
      } catch (e) {
        // Rollback on failure
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === id ? { ...ev, status: "available" } : ev,
          ),
        );
        throw e;
      }
    },
    [setEvents],
  );

  // Update session metadata
  const updateSessionMeta = useCallback(
    async (
      id: string,
      patch: { name?: string | null; color?: string | null },
    ) => {
      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update session");
        }

        setEvents((prev) =>
          prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        );
      } catch (e) {
        throw e;
      }
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
    joinSession,
    updateSessionMeta,
  };
}

export default useCalendarSessions;
