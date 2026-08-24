"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import type { CalendarEvent, FetchedSession, OccupiedSession } from "@/types/calendar";
import { toISO, addDays, addMinutes } from "@/lib/utils";
import { type DurationMin } from "@/constants/calendar";
import * as sessionsApi from "@/lib/api/sessionsApi";
import { getAblyClient } from "@/lib/ably-client";
import { sessionsChannel } from "@/lib/realtimeChannels";
import type { SessionRealtimeEvent } from "@/types/sessionRealtime";
import { swrKeys } from "@/lib/swr/keys";

function refreshMineUpcoming() {
  void globalMutate(swrKeys.sessionsMineUpcoming);
}

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
  /** Booked sessions for occupancy chips (not bookable) */
  occupied: OccupiedSession[];
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
  deleteSession: (id: string, message?: string) => Promise<void>;
  /** Leave a session (participant only; session stays available for owner) */
  leaveSession: (id: string, message?: string) => Promise<void>;
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

function mapFetchedToOccupied(session: FetchedSession): OccupiedSession {
  const people = (session.participants ?? []).slice(0, 2).map((p) => {
    const first = p.firstname?.trim() || p.username?.trim() || "";
    const last = p.lastname?.trim() || "";
    const initials =
      `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() ||
      (p.username?.slice(0, 2).toUpperCase() ?? "?");
    return {
      id: p.user_id,
      avatarUrl: p.avatar_url ?? null,
      initials,
    };
  });
  return {
    id: session.id,
    start: session.start,
    end: session.end,
    participantCount: session.participants?.length ?? people.length,
    people,
  };
}

function isSessionVisibleToUser(
  session: FetchedSession,
  userId: string | null,
): boolean {
  const count = session.participants?.length ?? 0;
  if (count < 2) return true;
  if (!userId) return false;
  if (session.owner_id === userId) return true;
  return (session.participants ?? []).some((p) => p.user_id === userId);
}

function sessionOverlapsRange(
  session: FetchedSession,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const startMs = new Date(session.start).getTime();
  const endMs = new Date(session.end).getTime();
  return startMs < rangeEnd.getTime() && endMs > rangeStart.getTime();
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
  const [occupied, setOccupied] = useState<OccupiedSession[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const daysRef = useRef(days);
  const currentUserIdRef = useRef<string | null>(null);

  const fromIso = days.length > 0 ? toISO(days[0]) : null;
  const toIso =
    days.length > 0 ? toISO(addDays(days[days.length - 1], 1)) : null;
  const sessionsKey =
    fromIso && toIso ? swrKeys.sessions(fromIso, toIso) : null;

  const {
    data: sessionsData,
    error: sessionsError,
    isLoading: sessionsLoading,
    mutate: mutateSessions,
  } = useSWR(
    sessionsKey,
    () =>
      sessionsApi.list(fromIso!, toIso!).then((result) => {
        if (!result.ok) throw new Error(result.error);
        return result.data;
      }),
    {
      keepPreviousData: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      // Background failures should not clear cached sessions.
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 2_000,
    },
  );

  daysRef.current = days;

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

  /** Quiet revalidate — keeps current events on screen (no loading flash). */
  const refreshInBackground = useCallback(() => {
    void mutateSessions(undefined, { revalidate: true });
  }, [mutateSessions]);

  // Sync SWR cache into local event state (instant on revisit when cached).
  useEffect(() => {
    if (!sessionsData) return;
    const uid = sessionsData.currentUserId ?? null;
    setCurrentUserId(uid);
    currentUserIdRef.current = uid;
    setEvents(sessionsData.sessions.map(mapFetchedToEvent));
    setOccupied(sessionsData.occupied ?? []);
    setError(null);
  }, [sessionsData, setEvents]);

  useEffect(() => {
    if (!sessionsError) return;
    console.error("/api/sessions failed", sessionsError);
    // Only surface an error when we have nothing to show.
    if (!sessionsData) {
      setError("Could not load sessions");
    }
  }, [sessionsError, sessionsData]);

  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time: Ably session deltas + quiet background refresh fallbacks
  useEffect(() => {
    if (days.length === 0) return;

    const scheduleRefresh = () => {
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
      }
      refreshDebounceRef.current = setTimeout(() => {
        refreshInBackground();
      }, 200);
    };

    const applyRealtimeEvent = (data: SessionRealtimeEvent) => {
      const visibleDays = daysRef.current;
      if (visibleDays.length === 0) return;
      const rangeStart = visibleDays[0];
      const rangeEnd = addDays(visibleDays[visibleDays.length - 1], 1);
      const userId = currentUserIdRef.current;

      if (data.type === "session_removed") {
        setEvents((prev) => prev.filter((e) => e.id !== data.sessionId));
        setOccupied((prev) => prev.filter((e) => e.id !== data.sessionId));
        refreshMineUpcoming();
        return;
      }

      if (data.type !== "session_upserted" || !data.session) return;
      const session = data.session;
      const inRange = sessionOverlapsRange(session, rangeStart, rangeEnd);
      const visible = isSessionVisibleToUser(session, userId);
      const booked = (session.participants?.length ?? 0) >= 2;

      // Keep the Upcoming sidebar in sync when the viewer is involved.
      if (
        userId &&
        (session.owner_id === userId ||
          (session.participants ?? []).some((p) => p.user_id === userId))
      ) {
        refreshMineUpcoming();
      }

      // Occupancy layer: keep booked sessions visible as chips for everyone.
      if (inRange && booked) {
        const occ = mapFetchedToOccupied(session);
        setOccupied((prev) => {
          const idx = prev.findIndex((e) => e.id === occ.id);
          if (idx === -1) return [...prev, occ];
          const next = [...prev];
          next[idx] = occ;
          return next;
        });
      } else {
        setOccupied((prev) => prev.filter((e) => e.id !== session.id));
      }

      if (!inRange || !visible) {
        setEvents((prev) => prev.filter((e) => e.id !== session.id));
        return;
      }

      const mapped = mapFetchedToEvent(session);
      setEvents((prev) => {
        const withoutTemps = prev.filter((e) => {
          if (!e.id.startsWith("temp_")) return true;
          return !(
            e.start === mapped.start &&
            e.owner_id === mapped.owner_id &&
            e.durationMin === mapped.durationMin
          );
        });
        const idx = withoutTemps.findIndex((e) => e.id === mapped.id);
        if (idx === -1) return [...withoutTemps, mapped];
        const existing = withoutTemps[idx];
        const next = [...withoutTemps];
        next[idx] = {
          ...mapped,
          // Realtime payloads omit per-user labels; keep the viewer's name.
          name: existing.name ?? mapped.name ?? null,
        };
        return next;
      });
    };

    let channel: ReturnType<ReturnType<typeof getAblyClient>["channels"]["get"]> | null =
      null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const onVisibleAgain = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    const onFocus = () => scheduleRefresh();

    // Light background reconciliation even when realtime is healthy.
    const BACKGROUND_POLL_MS = 90_000;
    pollInterval = setInterval(scheduleRefresh, BACKGROUND_POLL_MS);
    document.addEventListener("visibilitychange", onVisibleAgain);
    window.addEventListener("focus", onFocus);

    try {
      const client = getAblyClient();
      channel = client.channels.get(sessionsChannel());
      const onEvent = (message: { data?: unknown }) => {
        try {
          const data = message.data as SessionRealtimeEvent | undefined;
          if (!data?.type) return;
          applyRealtimeEvent(data);
        } catch {
          // ignore malformed payloads
        }
      };
      channel.subscribe("event", onEvent);

      const onConnectionChange = () => {
        const state = client.connection.state;
        // When Ably drops, poll more often until it recovers.
        if (state === "failed" || state === "suspended") {
          if (pollInterval) clearInterval(pollInterval);
          pollInterval = setInterval(scheduleRefresh, 30_000);
        } else if (state === "connected") {
          if (pollInterval) clearInterval(pollInterval);
          pollInterval = setInterval(scheduleRefresh, BACKGROUND_POLL_MS);
        }
      };
      client.connection.on(onConnectionChange);

      return () => {
        channel?.unsubscribe("event", onEvent);
        client.connection.off(onConnectionChange);
        document.removeEventListener("visibilitychange", onVisibleAgain);
        window.removeEventListener("focus", onFocus);
        if (pollInterval) clearInterval(pollInterval);
        if (refreshDebounceRef.current) {
          clearTimeout(refreshDebounceRef.current);
          refreshDebounceRef.current = null;
        }
      };
    } catch {
      // Ably unavailable — keep the quiet poll + focus/visibility refresh.
      return () => {
        document.removeEventListener("visibilitychange", onVisibleAgain);
        window.removeEventListener("focus", onFocus);
        if (pollInterval) clearInterval(pollInterval);
        if (refreshDebounceRef.current) {
          clearTimeout(refreshDebounceRef.current);
          refreshDebounceRef.current = null;
        }
      };
    }
  }, [days.length, setEvents, refreshInBackground]);

  const isLoading = sessionsLoading && !sessionsData;

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
      refreshMineUpcoming();
      refreshInBackground();
    },
    [currentUserId, setEvents, refreshInBackground],
  );

  const deleteSession = useCallback(
    async (id: string, message?: string) => {
      const existing = events.find((e) => e.id === id);
      if (existing) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }

      const result = await sessionsApi.deleteSession(id, message);

      if (!result.ok) {
        if (existing) setEvents((prev) => [...prev, existing]);
        throw new sessionsApi.ApiError(result.error);
      }
      refreshMineUpcoming();
      refreshInBackground();
    },
    [events, setEvents, refreshInBackground],
  );

  const leaveSession = useCallback(
    async (id: string, message?: string) => {
      const existing = events.find((e) => e.id === id);
      if (existing) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }

      const result = await sessionsApi.leave(id, message);

      if (!result.ok) {
        if (existing) setEvents((prev) => [...prev, existing]);
        throw new sessionsApi.ApiError(result.error);
      }
      refreshMineUpcoming();
      refreshInBackground();
    },
    [events, setEvents, refreshInBackground],
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
      refreshMineUpcoming();
      refreshInBackground();
    },
    [setEvents, refreshInBackground],
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
    occupied,
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
