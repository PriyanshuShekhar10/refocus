"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import BookSessionButton from "../BookSessionButton";
import { DURATION_OPTIONS, type DurationMin } from "@/constants/calendar";
import type { CalendarEvent, FetchedSession } from "@/types/calendar";
import { formatLocalTime } from "@/lib/localTime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as sessionsApi from "@/lib/api/sessionsApi";
import { swrKeys } from "@/lib/swr/keys";
import { useIsEngagementCrew } from "@/hooks/useIsEngagementCrew";

const UPCOMING_PREVIEW_COUNT = 2;
const CALENDAR_SLOT_TIP_KEY = "refocus.hideCalendarSlotTip";
const CALENDAR_SLOT_CREATED_EVENT = "refocus:calendar-slot-created";

function toYmd(d: Date) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function formatUpcomingWhen(start: Date, durationMin: number) {
  const time = formatLocalTime(start, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const meta = `${time} · ${durationMin} min`;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (toYmd(start) === toYmd(today)) return meta;
  if (toYmd(start) === toYmd(tomorrow)) return `Tomorrow · ${meta}`;
  const day = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${day} · ${meta}`;
}

function partnerInfo(
  ev: CalendarEvent,
  currentUserId: string | null,
): { label: string; avatarUrl: string | null; initials: string; matched: boolean } {
  const other = (ev.participants ?? []).find((p) => p.user_id !== currentUserId);
  if (!other) {
    return {
      label: "open seat",
      avatarUrl: null,
      initials: "?",
      matched: false,
    };
  }
  const first = other.firstname?.trim();
  const full = [other.firstname, other.lastname].filter(Boolean).join(" ").trim();
  const label = first || full || other.email || "Partner";
  const initials =
    label
      .split(/\s+/)
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  return {
    label,
    avatarUrl: other.avatar_url ?? null,
    initials,
    matched: true,
  };
}

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

interface CalendarSidebarProps {
  createDuration: DurationMin;
  onCreateDurationChange: (duration: DurationMin) => void;
  /** For Upcoming section actions (fallback id when SWR has not loaded yet) */
  currentUserId?: string | null;
  onJoinSession?: (event: CalendarEvent) => void;
  onDetailsSession?: (event: CalendarEvent) => void;
  onLeaveSession?: (event: CalendarEvent) => void;
  onDeleteSession?: (event: CalendarEvent) => void;
}

export function CalendarSidebar({
  createDuration,
  onCreateDurationChange,
  currentUserId: currentUserIdProp,
  onDetailsSession,
}: CalendarSidebarProps) {
  const { isCrew } = useIsEngagementCrew();
  const [showSlotTip, setShowSlotTip] = useState(true);

  useEffect(() => {
    if (isCrew && createDuration === 25) {
      onCreateDurationChange(50);
    }
  }, [isCrew, createDuration, onCreateDurationChange]);

  useEffect(() => {
    try {
      if (localStorage.getItem(CALENDAR_SLOT_TIP_KEY) === "1") {
        setShowSlotTip(false);
      }
    } catch {
      // ignore
    }
    const hide = () => setShowSlotTip(false);
    window.addEventListener(CALENDAR_SLOT_CREATED_EVENT, hide);
    return () => window.removeEventListener(CALENDAR_SLOT_CREATED_EVENT, hide);
  }, []);

  const { data: upcomingData } = useSWR(
    swrKeys.sessionsMineUpcoming,
    () =>
      sessionsApi.listMineUpcoming().then((result) => {
        if (!result.ok) throw new Error(result.error);
        return result.data;
      }),
    { revalidateOnFocus: true },
  );

  const currentUserId = upcomingData?.currentUserId ?? currentUserIdProp ?? null;

  const upcomingSessions = useMemo(() => {
    if (!upcomingData?.sessions) return [];
    const now = Date.now();
    return upcomingData.sessions
      .map(mapFetchedToEvent)
      .filter((ev) => new Date(ev.end).getTime() >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [upcomingData]);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white px-7 py-7 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {/* New session: configure duration, then book */}
      <section>
        <h2 className="text-[18px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          New session
        </h2>

        <div className="mt-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Duration
          </p>
          <div
            className="mt-2 flex gap-1 rounded-lg bg-gray-100/80 p-1 dark:bg-gray-800/80"
            role="group"
            aria-label="Session duration"
          >
            {DURATION_OPTIONS.map((d) => {
              const blocked = isCrew && d === 25;
              const selected = createDuration === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => !blocked && onCreateDurationChange(d)}
                  disabled={blocked}
                  aria-pressed={selected}
                  title={
                    blocked ? "25-minute sessions are unavailable" : undefined
                  }
                  className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA5995]/40 ${
                    blocked
                      ? "cursor-not-allowed text-gray-400 opacity-40 dark:text-gray-600"
                      : selected
                        ? "bg-[#5D1C6A] text-white shadow-sm dark:bg-[#7A2D88]"
                        : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  {d} min
                </button>
              );
            })}
          </div>
        </div>

        <BookSessionButton
          label={`Book a ${createDuration} min session`}
          defaultDuration={createDuration}
          className="mt-5 h-12 w-full rounded-lg bg-[#5D1C6A] px-4 py-0 text-sm font-semibold text-white hover:bg-[#CA5995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA5995]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-[#7A2D88] dark:hover:bg-[#CA5995] dark:focus-visible:ring-offset-gray-900"
        />

        {showSlotTip ? (
          <p className="mt-5 text-[11px] leading-snug text-gray-400 dark:text-gray-500">
            You can also click an empty calendar slot.
          </p>
        ) : null}
      </section>

      {/* Upcoming — compact preview */}
      <section className="mt-7 border-t border-gray-100/70 pt-6 dark:border-gray-800/60">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[17px] font-medium text-gray-800 dark:text-gray-200">
            Upcoming
          </h3>
          {upcomingSessions.length > 0 ? (
            <span className="text-[10px] font-medium tabular-nums text-gray-400 dark:text-gray-500">
              {upcomingSessions.length === 1
                ? "1 up next"
                : `${upcomingSessions.length} lined up`}
            </span>
          ) : null}
        </div>

        {upcomingSessions.length === 0 ? (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            No upcoming sessions
          </p>
        ) : (
          <>
            <ul className="mt-2 space-y-1.5">
              {upcomingSessions.slice(0, UPCOMING_PREVIEW_COUNT).map((ev) => {
                const start = new Date(ev.start);
                const duration = ev.durationMin ?? 25;
                const partner = partnerInfo(ev, currentUserId);
                const rowClass =
                  "flex w-full items-center gap-2.5 rounded-lg border border-transparent bg-[#FFF1D3]/40 px-2 py-2 text-left outline-none transition-all hover:border-[#CA5995]/25 hover:bg-[#FFF1D3]/80 focus-visible:ring-2 focus-visible:ring-[#CA5995]/40 dark:bg-[#5D1C6A]/15 dark:hover:border-[#CA5995]/35 dark:hover:bg-[#5D1C6A]/30";

                const content = (
                  <>
                    <span
                      className="h-8 w-0.5 shrink-0 rounded-full bg-[#CA5995]"
                      aria-hidden="true"
                    />
                    <Avatar className="h-7 w-7 shrink-0">
                      {partner.avatarUrl ? (
                        <AvatarImage src={partner.avatarUrl} alt={partner.label} />
                      ) : null}
                      <AvatarFallback
                        className={`text-[10px] font-semibold ${
                          partner.matched
                            ? "bg-[#FFF1D3] text-[#5D1C6A] dark:bg-slate-800 dark:text-[#FFB090]"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                        }`}
                      >
                        {partner.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {formatUpcomingWhen(start, duration)}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-gray-500 dark:text-gray-400">
                        {partner.matched ? (
                          <>
                            with{" "}
                            <span className="font-medium text-[#5D1C6A] dark:text-[#FFB090]">
                              {partner.label}
                            </span>
                          </>
                        ) : (
                          <span className="italic">looking for a partner</span>
                        )}
                      </span>
                    </span>
                  </>
                );

                return (
                  <li key={ev.id}>
                    {onDetailsSession ? (
                      <button
                        type="button"
                        onClick={() => onDetailsSession(ev)}
                        className={rowClass}
                      >
                        {content}
                      </button>
                    ) : (
                      <div className={rowClass}>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>

            {upcomingSessions.length > UPCOMING_PREVIEW_COUNT ? (
              <Link
                href="/sessions"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#5D1C6A] transition-colors hover:text-[#CA5995] dark:text-[#FFB090] dark:hover:text-[#CA5995]"
              >
                View all
                <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </>
        )}
      </section>
    </aside>
  );
}
