"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ConfirmModal,
  partnerNoteField,
} from "@/app/(product)/components/Calendar/Modals/ConfirmModal";
import { useOnPageRefreshEvent, PAGE_REFRESH_EVENTS } from "@/components/page-refresh";
import * as sessionsApi from "@/lib/api/sessionsApi";
import { formatLocalDate, formatLocalTime } from "@/lib/localTime";
import { isCallJoinable } from "@/lib/sessionWindow";
import { swrKeys } from "@/lib/swr/keys";
import type { CalendarEvent, FetchedSession } from "@/types/calendar";

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

function partnerLabel(
  event: CalendarEvent,
  currentUserId: string | null,
): { name: string; avatarUrl: string | null } | null {
  const other = (event.participants ?? []).find(
    (p) => p.user_id !== currentUserId,
  );
  if (!other) return null;
  const name =
    [other.firstname, other.lastname].filter(Boolean).join(" ").trim() ||
    other.username ||
    other.email?.split("@")[0] ||
    "Partner";
  return { name, avatarUrl: other.avatar_url ?? null };
}

function formatWhen(startIso: string, durationMin: number): string {
  const start = new Date(startIso);
  const time = formatLocalTime(start, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const ymd = (d: Date) =>
    d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const meta = `${time} · ${durationMin} min`;
  if (ymd(start) === ymd(today)) return meta;
  if (ymd(start) === ymd(tomorrow)) return `Tomorrow · ${meta}`;
  return `${formatLocalDate(start, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${meta}`;
}

interface UpcomingSessionsPanelProps {
  compact?: boolean;
}

export function UpcomingSessionsPanel({
  compact = false,
}: UpcomingSessionsPanelProps) {
  const { data, isLoading, mutate } = useSWR(
    swrKeys.sessionsMineUpcoming,
    () =>
      sessionsApi.listMineUpcoming().then((result) => {
        if (!result.ok) throw new Error(result.error);
        return result.data;
      }),
    { revalidateOnFocus: true },
  );

  useOnPageRefreshEvent(PAGE_REFRESH_EVENTS.sessions, () => {
    void mutate();
  });

  const currentUserId = data?.currentUserId ?? null;
  const sessions = useMemo(() => {
    if (!data?.sessions) return [];
    const now = Date.now();
    return data.sessions
      .map(mapFetchedToEvent)
      .filter((ev) => new Date(ev.end).getTime() >= now)
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
  }, [data]);

  const [leaveTarget, setLeaveTarget] = useState<CalendarEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async (message?: string) => {
    if (!leaveTarget) return;
    const result = await sessionsApi.leave(leaveTarget.id, message);
    if (!result.ok) {
      setError(result.error);
      throw new Error(result.error);
    }
    setLeaveTarget(null);
    setError(null);
    await mutate();
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div
        className={`flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 ${
          compact ? "px-4 py-3" : "px-5 py-4"
        }`}
      >
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Upcoming
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Sessions you’ve booked or joined
          </p>
        </div>
        {sessions.length > 0 ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {sessions.length}
          </span>
        ) : null}
      </div>

      <div className={compact ? "p-3" : "p-4"}>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading upcoming sessions…
          </p>
        ) : sessions.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No upcoming sessions
            </p>
            <Link
              href="/dashboard"
              className="mt-3 inline-flex text-sm font-medium text-[#5D1C6A] hover:text-[#CA5995] dark:text-[#FFB090]"
            >
              Book from calendar →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {sessions.map((event) => {
              const isOwner =
                Boolean(event.owner_id) &&
                Boolean(currentUserId) &&
                event.owner_id === currentUserId;
              const booked = (event.participants?.length ?? 0) >= 2;
              const joinable = isCallJoinable(event.start, event.end);
              const partner = partnerLabel(event, currentUserId);
              const canLeave = !isOwner;

              return (
                <li
                  key={event.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-950/40"
                >
                  <div className="flex items-start gap-3">
                    {partner ? (
                      <Avatar className="mt-0.5 h-9 w-9 shrink-0">
                        {partner.avatarUrl ? (
                          <AvatarImage
                            src={partner.avatarUrl}
                            alt={partner.name}
                          />
                        ) : null}
                        <AvatarFallback className="bg-[#FFF1D3] text-xs font-semibold text-[#5D1C6A] dark:bg-[#5D1C6A] dark:text-[#FFB090]">
                          {partner.name[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        ?
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatWhen(event.start, event.durationMin)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {partner ? (
                          <>
                            with{" "}
                            <span className="font-medium text-[#5D1C6A] dark:text-[#FFB090]">
                              {partner.name}
                            </span>
                          </>
                        ) : (
                          <span className="italic">Waiting for a partner</span>
                        )}
                        {" · "}
                        {isOwner ? "Hosting" : "Joined"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {joinable && booked ? (
                          <Link
                            href={`/sessions/${event.id}`}
                            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-[#5D1C6A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#CA5995] sm:flex-none"
                          >
                            Join now
                          </Link>
                        ) : (
                          <Link
                            href={`/sessions/${event.id}`}
                            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 sm:flex-none"
                          >
                            View
                          </Link>
                        )}

                        {canLeave ? (
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setLeaveTarget(event);
                            }}
                            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-amber-500/60 bg-white px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-500/50 dark:bg-transparent dark:text-amber-400 dark:hover:bg-amber-900/20 sm:flex-none"
                          >
                            Leave session
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {error ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>

      {leaveTarget ? (
        <ConfirmModal
          title="Leave session"
          description="Leave this session? The slot will be available for someone else."
          confirmText="Leave session"
          cancelText="Cancel"
          confirmVariant="danger"
          messageField={partnerNoteField(leaveTarget, currentUserId)}
          onCancel={() => setLeaveTarget(null)}
          onConfirm={handleLeave}
        />
      ) : null}
    </section>
  );
}
