import type { CalendarEvent } from "@/types/calendar";
import { hasSessionStarted } from "@/lib/sessionWindow";
import { isPastUnmatchedSession } from "@/lib/calendarOccupancy";
import type { DayLayoutEvent } from "@/lib/calendarDayEvents";

export type SessionUiState = "available" | "joined" | "yours" | "past";

export function classifySessionUiState(
  event: CalendarEvent,
  currentUserId: string | null,
  now: Date = new Date(),
): SessionUiState {
  if (new Date(event.end).getTime() < now.getTime()) return "past";

  const isOwner =
    Boolean(event.owner_id) &&
    Boolean(currentUserId) &&
    event.owner_id === currentUserId;
  if (isOwner) return "yours";

  const isParticipant = (event.participants ?? []).some(
    (p) => p.user_id === currentUserId,
  );
  if (isParticipant) return "joined";

  return "available";
}

export function isUserInSession(
  event: CalendarEvent,
  currentUserId: string | null,
): boolean {
  if (!currentUserId) return false;
  if (event.owner_id === currentUserId) return true;
  return (event.participants ?? []).some((p) => p.user_id === currentUserId);
}

/** Filter day layout events the way the old mobile timeline did. */
export function filterAgendaEvents(
  dayEvents: DayLayoutEvent[],
  currentUserId: string | null,
): DayLayoutEvent[] {
  const mySessionsOnDay = dayEvents.filter((e) =>
    isUserInSession(e, currentUserId),
  );

  return dayEvents.filter((ev) => {
    if (isPastUnmatchedSession(ev, currentUserId)) return false;

    const isMine = isUserInSession(ev, currentUserId);
    if (!isMine && hasSessionStarted(ev.start)) return false;

    if (!isMine) {
      const overlapsMine = mySessionsOnDay.some(
        (e) => e.id !== ev.id && ev.startMs < e.endMs && ev.endMs > e.startMs,
      );
      if (overlapsMine) return false;
    }

    // Skip midnight continuation fragments — agenda shows the primary block
    if (ev.isContinuation) return false;

    return true;
  });
}

/** Soonest upcoming session the user owns or has joined (today). */
export function pickNextUpSession(
  events: DayLayoutEvent[],
  currentUserId: string | null,
  now: Date = new Date(),
): DayLayoutEvent | null {
  const upcoming = events
    .filter((ev) => {
      if (!isUserInSession(ev, currentUserId)) return false;
      return new Date(ev.start).getTime() > now.getTime();
    })
    .sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );

  return upcoming[0] ?? null;
}

export function formatStartsIn(start: Date | string, now: Date = new Date()): string {
  const startMs = new Date(start).getTime();
  const diffMin = Math.max(0, Math.round((startMs - now.getTime()) / 60_000));
  if (diffMin < 1) return "Starting now";
  if (diffMin < 60) return `Starts in ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) return `Starts in ${hours}h`;
  return `Starts in ${hours}h ${mins}m`;
}

export function participantDisplayName(
  p: NonNullable<CalendarEvent["participants"]>[number],
): string {
  return (
    [p.firstname, p.lastname].filter(Boolean).join(" ") ||
    p.username ||
    p.email?.split("@")[0] ||
    "Someone"
  );
}

export function getOtherParticipants(
  event: CalendarEvent,
  currentUserId: string | null,
) {
  return (event.participants ?? []).filter((p) => p.user_id !== currentUserId);
}
