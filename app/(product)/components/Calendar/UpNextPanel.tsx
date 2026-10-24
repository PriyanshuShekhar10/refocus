"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { CalendarEvent, FetchedSession } from "@/types/calendar";
import { formatLocalTime } from "@/lib/localTime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as sessionsApi from "@/lib/api/sessionsApi";
import { swrKeys } from "@/lib/swr/keys";
import { CALL_JOIN_VISIBLE_MINUTES, isCallJoinable } from "@/lib/sessionWindow";

const LATER_COUNT = 5;

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

function initialsOf(label: string) {
  return (
    label
      .split(/\s+/)
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

function partnerOf(ev: CalendarEvent, currentUserId: string | null) {
  const other = (ev.participants ?? []).find((p) => p.user_id !== currentUserId);
  if (!other) return null;
  const label =
    [other.firstname, other.lastname].filter(Boolean).join(" ").trim() ||
    (other.username ? `@${other.username}` : "") ||
    "Partner";
  return { label, avatarUrl: other.avatar_url ?? null, initials: initialsOf(label) };
}

function ymd(d: Date) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function relDay(start: Date, now: Date) {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (ymd(start) === ymd(now)) return "Today";
  if (ymd(start) === ymd(tomorrow)) return "Tomorrow";
  return start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function startsIn(start: Date, end: Date, now: Date) {
  if (start.getTime() <= now.getTime() && now.getTime() <= end.getTime()) {
    return "Live now";
  }
  if (ymd(start) !== ymd(now)) return relDay(start, now);
  const mins = Math.round((start.getTime() - now.getTime()) / 60000);
  if (mins < 1) return "Starting now";
  if (mins < 60) return `Starts in ${mins} min`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return `Starts in ${h}h${r ? ` ${r}m` : ""}`;
}

const timeFmt = { hour: "numeric", minute: "2-digit", hour12: true } as const;

interface UpNextPanelProps {
  onOpenSession?: (event: CalendarEvent) => void;
  onTestDevices?: () => void;
  onJoin?: () => void;
}

export function UpNextPanel({ onOpenSession, onTestDevices, onJoin }: UpNextPanelProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data } = useSWR(
    swrKeys.sessionsMineUpcoming,
    () =>
      sessionsApi.listMineUpcoming().then((result) => {
        if (!result.ok) throw new Error(result.error);
        return result.data;
      }),
    { revalidateOnFocus: true },
  );

  const currentUserId = data?.currentUserId ?? null;
  const upcoming = useMemo(() => {
    if (!data?.sessions) return [];
    const t = now.getTime();
    return data.sessions
      .map(mapFetchedToEvent)
      .filter((ev) => new Date(ev.end).getTime() >= t)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [data, now]);

  const next = upcoming[0];
  const later = upcoming.slice(1, 1 + LATER_COUNT);

  return (
    <>
      {next ? (
        (() => {
          const start = new Date(next.start);
          const end = new Date(next.end);
          const partner = partnerOf(next, currentUserId);
          const hosting = next.owner_id === currentUserId;
          const canJoin = !!partner && isCallJoinable(start, end, now);
          const opensAt = new Date(start.getTime() - CALL_JOIN_VISIBLE_MINUTES * 60_000);
          return (
            <div className="flex shrink-0 flex-col gap-2.5 rounded-[20px] border-2 border-b-[5px] border-rf-primary bg-rf-next-bg px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="whitespace-nowrap text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-rf-primary-shadow">
                  Next up
                </span>
                <span className="whitespace-nowrap text-xs font-extrabold text-rf-primary-shadow">
                  {startsIn(start, end, now)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenSession?.(next)}
                className="flex items-center gap-2.5 text-left text-rf-ink"
              >
                <Avatar className="h-10 w-10 shrink-0 border-2 border-rf-card ring-2 ring-rf-primary">
                  {partner?.avatarUrl ? (
                    <AvatarImage src={partner.avatarUrl} alt={partner.label} />
                  ) : null}
                  <AvatarFallback className="bg-rf-cream-bg text-[13px] font-extrabold text-rf-ink">
                    {partner ? partner.initials : "···"}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-col leading-[1.35]">
                  <span className="truncate text-[15px] font-extrabold">
                    {partner ? partner.label : "Waiting for match"}
                  </span>
                  <span className="whitespace-nowrap text-[12.5px] text-rf-ink-soft">
                    {formatLocalTime(start, timeFmt)} – {formatLocalTime(end, timeFmt)}
                    {hosting ? " · Hosting" : " · Joined"}
                  </span>
                </span>
              </button>
              {canJoin ? (
                <Link
                  href={`/sessions/${next.id}`}
                  onClick={onJoin}
                  className="flex h-11 items-center justify-center rounded-[14px] bg-rf-primary text-sm font-extrabold uppercase tracking-[0.06em] text-rf-on-primary shadow-[0_4px_0_var(--rf-primary-shadow)] transition-transform hover:bg-rf-primary-hover active:translate-y-1 active:shadow-none"
                >
                  Join session
                </Link>
              ) : partner ? (
                <span
                  aria-disabled="true"
                  title={`The room opens ${CALL_JOIN_VISIBLE_MINUTES} min before start.`}
                  className="flex h-11 items-center justify-center rounded-[14px] bg-rf-primary text-sm font-extrabold uppercase tracking-[0.06em] text-rf-on-primary opacity-[.55] shadow-[0_4px_0_var(--rf-primary-shadow)]"
                >
                  Opens {formatLocalTime(opensAt, timeFmt)}
                </span>
              ) : (
                <p className="text-[12.5px] text-rf-ink-soft">
                  We&apos;ll match you with a partner before it starts.
                </p>
              )}
              {onTestDevices ? (
                <button
                  type="button"
                  onClick={onTestDevices}
                  className="h-9 rounded-xl border-2 border-b-4 border-rf-next-soft bg-rf-card text-[12.5px] font-bold text-rf-primary-shadow transition-transform active:translate-y-[2px] active:border-b-2"
                >
                  Test audio and video
                </button>
              ) : null}
            </div>
          );
        })()
      ) : (
        <div className="flex shrink-0 flex-col gap-2.5 rounded-[20px] border-2 border-b-[5px] border-rf-chunk bg-rf-card p-4">
          <span className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-rf-ink-mute">Next up</span>
          <p className="text-sm text-rf-ink-soft">Nothing booked yet.</p>
          <button
            type="button"
            onClick={() => document.querySelector<HTMLButtonElement>("[data-book-session-trigger]")?.click()}
            className="h-[42px] rounded-[14px] bg-rf-primary text-sm font-extrabold text-rf-on-primary shadow-[0_4px_0_var(--rf-primary-shadow)] transition-transform hover:bg-rf-primary-hover active:translate-y-1 active:shadow-none"
          >
            Book a session
          </button>
        </div>
      )}

      <div className="flex shrink-0 flex-col">
        <span className="px-2 pb-1 text-[11.5px] font-semibold tracking-[0.02em] text-rf-ink-mute">
          Later
        </span>
        {later.map((ev) => {
          const start = new Date(ev.start);
          const partner = partnerOf(ev, currentUserId);
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => onOpenSession?.(ev)}
              className="flex items-baseline justify-between gap-2.5 rounded-[8px] px-1 py-2 text-left text-rf-ink transition-colors hover:bg-rf-line-soft"
            >
              <span className="truncate text-[13px] font-medium">
                {partner ? partner.label : "Waiting for match"}
              </span>
              <span className="shrink-0 whitespace-nowrap text-xs text-rf-ink-mute">
                {relDay(start, now)} · {formatLocalTime(start, timeFmt)}
              </span>
            </button>
          );
        })}
        {later.length === 0 ? (
          <p className="px-2 pb-2.5 pt-1.5 text-[12.5px] text-rf-ink-mute">
            Nothing else booked this week.
          </p>
        ) : upcoming.length > 1 + LATER_COUNT ? (
          <Link
            href="/dashboard?tab=sessions"
            className="px-2 pb-1 pt-1.5 text-xs font-medium text-rf-plum-ink hover:underline"
          >
            View all →
          </Link>
        ) : null}
      </div>
    </>
  );
}
