"use client";

import { useState, useMemo } from "react";
import BookSessionButton from "../BookSessionButton";
import { DURATION_OPTIONS, TIME_CONFIG, type DurationMin } from "@/constants/calendar";
import type { CalendarEvent } from "@/types/calendar";

function toYmd(d: Date) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function formatUpcomingDate(d: Date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (toYmd(d) === toYmd(today)) return "Today";
  if (toYmd(d) === toYmd(tomorrow))
    return `Tomorrow, ${d.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

interface CalendarSidebarProps {
  createDuration: DurationMin;
  onCreateDurationChange: (duration: DurationMin) => void;
  /** For Upcoming section */
  events?: CalendarEvent[];
  currentUserId?: string | null;
  onJoinSession?: (event: CalendarEvent) => void;
  onDetailsSession?: (event: CalendarEvent) => void;
  onLeaveSession?: (event: CalendarEvent) => void;
  onDeleteSession?: (event: CalendarEvent) => void;
}

export function CalendarSidebar({
  createDuration,
  onCreateDurationChange,
  events = [],
  currentUserId,
  onJoinSession,
  onDetailsSession,
  onLeaveSession,
  onDeleteSession,
}: CalendarSidebarProps) {
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  const upcomingSessions = useMemo(() => {
    if (!currentUserId) return [];
    const now = new Date();
    return events
      .filter((ev) => {
        const start = new Date(ev.start);
        if (start < now) return false;
        const isMine =
          (ev.owner_id && ev.owner_id === currentUserId) ||
          (ev.participants ?? []).some((p) => p.user_id === currentUserId);
        return isMine;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);
  }, [events, currentUserId]);

  const upcomingSubtitle = useMemo(() => {
    if (upcomingSessions.length === 0) return null;
    const first = new Date(upcomingSessions[0].start);
    return formatUpcomingDate(first);
  }, [upcomingSessions]);

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 h-full overflow-hidden">
      {/* Top: Book session + Quick book */}
      <div className="flex gap-2">
        <div className="flex-1">
          <BookSessionButton label="Book session" className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600" />
        </div>
        {/* <button
          type="button"
          onClick={() => document.querySelector<HTMLButtonElement>("[data-book-session-trigger]")?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          title="Quick book"
          aria-label="Quick book"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button> */}
      </div>

      {/* Session Settings (collapsible) */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setSettingsExpanded((e) => !e)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          aria-expanded={settingsExpanded}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Session Settings
            </span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400" title="Filter and default for new sessions">
              i
            </span>
          </div>
          <span
            className={`text-gray-500 transition-transform dark:text-gray-400 ${
              settingsExpanded ? "rotate-180" : ""
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        {settingsExpanded && (
          <div className="border-t border-gray-100 px-3 pb-3 pt-2 dark:border-gray-800">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Duration
                </p>
                <div className="mt-1.5 flex gap-1 rounded-lg bg-gray-100/80 p-1 dark:bg-gray-800/80">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onCreateDurationChange(d)}
                      className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                        createDuration === d
                          ? "bg-indigo-600 text-white shadow dark:bg-indigo-500"
                          : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Tip: click an empty slot to create your own session.
      </p>

      {/* Upcoming */}
      <section className="mt-auto flex flex-1 flex-col min-h-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="shrink-0 px-3 py-2.5">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Upcoming</h3>
          {upcomingSubtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{upcomingSubtitle}</p>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
          {upcomingSessions.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
              No upcoming sessions
            </p>
          ) : (
            <ul className="space-y-2">
              {upcomingSessions.map((ev) => {
                const start = new Date(ev.start);
                const end = new Date(ev.end);
                const isBooked = (ev.participants?.length ?? 0) >= 2;
                const isOwner = ev.owner_id === currentUserId;
                const other = (ev.participants ?? []).find((p) => p.user_id !== currentUserId);
                const otherName = other
                  ? [other.firstname, other.lastname].filter(Boolean).join(" ") ||
                    other.email ||
                    other.user_id
                  : "Partner needed";
                const timeRange = `${start.toLocaleTimeString("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: TIME_CONFIG.timezone,
                })} – ${end.toLocaleTimeString("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: TIME_CONFIG.timezone,
                })}`;
                const initials = otherName
                  .split(/\s+/)
                  .map((s) => s[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "?";

                return (
                  <li
                    key={ev.id}
                    className="flex items-stretch gap-2 rounded-lg border border-gray-200 bg-gray-50/80 p-2 dark:border-gray-700 dark:bg-gray-800/50"
                  >
                    <div className="w-1 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          {ev.durationMin} min ·{" "}
                          {isOwner ? "Your session" : ev.name || "Session"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-gray-900 dark:text-gray-100">
                        {timeRange}
                      </p>
                      <p className="truncate text-xs text-gray-600 dark:text-gray-300">{otherName}</p>
                      <div className="mt-2 flex items-center gap-1">
                        {isBooked ? (
                          <a
                            href={`/sessions/${ev.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                          >
                            Join
                          </a>
                        ) : onJoinSession ? (
                          <button
                            type="button"
                            onClick={() => onJoinSession(ev)}
                            className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                          >
                            Book
                          </button>
                        ) : null}
                        {onDetailsSession && (
                          <button
                            type="button"
                            onClick={() => onDetailsSession(ev)}
                            className="rounded p-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                            aria-label="More options"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </button>
                        )}
                        {(onLeaveSession || onDeleteSession) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isOwner && onDeleteSession) onDeleteSession(ev);
                              else if (!isOwner && onLeaveSession) onLeaveSession(ev);
                              else if (onDetailsSession) onDetailsSession(ev);
                            }}
                            className="rounded p-1 text-gray-500 hover:bg-red-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            aria-label={isOwner ? "Delete" : "Leave"}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {initials}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </aside>
  );
}
