"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { CalendarEvent, FetchedSession } from "@/types/calendar";
import { formatLocalTime } from "@/lib/localTime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as sessionsApi from "@/lib/api/sessionsApi";
import { swrKeys } from "@/lib/swr/keys";
import { isCallJoinable } from "@/lib/sessionWindow";

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
          return (
            <div className="flex shrink-0 flex-col gap-3 rounded-[14px] border border-rf-line bg-rf-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="whitespace-nowrap text-[11.5px] font-semibold tracking-[0.02em] text-rf-ink-mute">
                  Next up
                </span>
                <span className="whitespace-nowrap text-xs font-semibold text-rf-plum-ink">
                  {startsIn(start, end, now)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenSession?.(next)}
                className="flex items-center gap-2.5 text-left text-rf-ink"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  {partner?.avatarUrl ? (
                    <AvatarImage src={partner.avatarUrl} alt={partner.label} />
                  ) : null}
                  <AvatarFallback className="bg-rf-tint-blush text-xs font-semibold text-rf-ink">
                    {partner ? partner.initials : "···"}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-col leading-[1.35]">
                  <span className="truncate text-[14.5px] font-semibold">
                    {partner ? partner.label : "Waiting for match"}
                  </span>
                  <span className="whitespace-nowrap text-[12.5px] text-rf-ink-soft">
                    {formatLocalTime(start, timeFmt)} – {formatLocalTime(end, timeFmt)}
                    {hosting ? " · Hosting" : " · Joined"}
                  </span>
                </span>
              </button>
              {canJoin ? (
                <>
                  <Link
                    href={`/sessions/${next.id}`}
                    onClick={onJoin}
                    className="flex h-10 items-center justify-center rounded-[10px] bg-rf-primary text-sm font-semibold text-rf-on-primary transition-colors hover:bg-rf-primary-hover"
                  >
                    Join session
                  </Link>
                  {onTestDevices ? (
                    <button
                      type="button"
                      onClick={onTestDevices}
                      className="h-9 rounded-[9px] border border-rf-line text-[13px] font-medium text-rf-ink-soft transition-colors hover:bg-rf-line-soft hover:text-rf-ink"
                    >
                      Test audio and video
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="text-[12.5px] text-rf-ink-mute">
                  {partner
                    ? "The room opens 30 min before start."
                    : "We'll match you with a partner before it starts."}
                </p>
              )}
            </div>
          );
        })()
      ) : null}

      <div className="flex shrink-0 flex-col rounded-[14px] border border-rf-line bg-rf-card px-2 pb-2 pt-3">
        <span className="px-2 pb-1.5 text-[11.5px] font-semibold tracking-[0.02em] text-rf-ink-mute">
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
              className="flex min-h-12 items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left text-rf-ink transition-colors hover:bg-rf-line-soft"
            >
              <Avatar
                className={`h-7 w-7 shrink-0 ${partner ? "" : "border border-dashed border-rf-ink-mute"}`}
              >
                {partner?.avatarUrl ? (
                  <AvatarImage src={partner.avatarUrl} alt={partner.label} />
                ) : null}
                <AvatarFallback
                  className={`text-[10px] font-semibold text-rf-ink-soft ${
                    partner ? "bg-rf-tint-sky" : "bg-transparent"
                  }`}
                >
                  {partner ? partner.initials : "···"}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                <span className="truncate text-[13px] font-medium">
                  {partner ? partner.label : "Waiting for match"}
                </span>
                <span className="whitespace-nowrap text-[11.5px] text-rf-ink-mute">
                  {relDay(start, now)} · {formatLocalTime(start, timeFmt)}
                </span>
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
