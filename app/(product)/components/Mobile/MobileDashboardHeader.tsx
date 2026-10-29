"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as sessionsApi from "@/lib/api/sessionsApi";
import { swrKeys } from "@/lib/swr/keys";
import { useSessionStats } from "@/hooks/useSessionStats";
import { useClientGreeting } from "@/hooks/useClientGreeting";
import { attendanceLevel } from "@/lib/sessionAttendanceStats";
import { urlForTab } from "@/lib/dashboardTabs";
import type { CalendarEvent, FetchedSession } from "@/types/calendar";
import { WeekStreak } from "../Calendar/WeekStreak";
import { MobileNextUpCard } from "./MobileNextUpCard";

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

const ATTENDANCE_COLORS = {
  good: { text: "text-rf-ink", bar: "bg-rf-primary" },
  caution: { text: "text-rf-caution", bar: "bg-rf-caution" },
  warning: { text: "text-rf-warn", bar: "bg-rf-warn" },
  critical: { text: "text-rf-danger", bar: "bg-rf-danger" },
} as const;

/** Greeting + today's count, plus stacked attendance / streak / next-up cards. */
export function MobileDashboardHeader({
  onOpenNextUp,
  onTestDevices,
}: {
  onOpenNextUp: (event: CalendarEvent) => void;
  onTestDevices: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const { data: session } = useSession();
  const { greeting, dateLabel } = useClientGreeting();
  const { stats } = useSessionStats();
  const streak = stats?.currentStreak ?? 0;
  const [attendance, setAttendance] = useState<{
    percent: number;
    booked: number;
    attended: number;
  } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { data: upcomingData } = useSWR(swrKeys.sessionsMineUpcoming, () =>
    sessionsApi.listMineUpcoming().then((result) => {
      if (!result.ok) throw new Error(result.error);
      return result.data;
    }),
  );
  const todayCount = useMemo(() => {
    const sessions = upcomingData?.sessions ?? [];
    const today = new Date();
    return sessions.filter((s) => {
      const start = new Date(s.start);
      return (
        new Date(s.end).getTime() >= today.getTime() &&
        start.getFullYear() === today.getFullYear() &&
        start.getMonth() === today.getMonth() &&
        start.getDate() === today.getDate()
      );
    }).length;
  }, [upcomingData]);

  // Same selection as the desktop rail's UpNextPanel: soonest upcoming
  // session across all days (including one already in progress), not
  // scoped to whichever day the agenda happens to be showing.
  const currentUserId = upcomingData?.currentUserId ?? null;
  const nextUp = useMemo(() => {
    const sessions = upcomingData?.sessions ?? [];
    const t = now.getTime();
    const upcoming = sessions
      .filter((s) => new Date(s.end).getTime() >= t)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return upcoming[0] ? mapFetchedToEvent(upcoming[0]) : null;
  }, [upcomingData, now]);

  useEffect(() => {
    const fromSession = session?.user?.image?.trim();
    if (fromSession) setAvatarUrl(fromSession);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me");
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        const next = data?.user?.attendance;
        if (
          next &&
          typeof next.percent === "number" &&
          typeof next.attended === "number"
        ) {
          setAttendance(next);
        }
        if (data?.user?.avatarUrl) setAvatarUrl(data.user.avatarUrl);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.image]);

  const user = session?.user as { name?: string; email?: string } | undefined;
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="pt-3">
      <div className="flex items-center gap-2.5 px-4">
        <Link href={urlForTab("profile")} className="shrink-0" aria-label="My profile">
          <Avatar className="h-11 w-11">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="text-sm font-bold bg-rf-pink-soft text-rf-pink-ink">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[clamp(15px,5vw,20px)] font-bold leading-tight tracking-[-0.02em] text-rf-ink">
            {greeting}, {firstName}
          </h1>
          <p className="mt-0.5 truncate text-[clamp(11px,3.2vw,13px)] text-rf-ink-mute">
            {dateLabel}{" "}
            · {todayCount} session{todayCount !== 1 ? "s" : ""} today
          </p>
        </div>
      </div>

      {attendance || stats || nextUp ? (
        <div className="mt-3 flex flex-col gap-3 px-4">
          {attendance ? (
            <div className="flex flex-col gap-2.5 rounded-2xl border border-rf-line bg-rf-card p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold text-rf-ink-mute">Your attendance</span>
                <span className="text-[11.5px] text-rf-ink-mute">
                  {attendance.attended} of {attendance.booked} showed up
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-2xl font-extrabold leading-none tracking-[-0.03em] tabular-nums ${
                    ATTENDANCE_COLORS[attendanceLevel(attendance.percent)].text
                  }`}
                >
                  {attendance.percent}%
                </span>
                <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-rf-line-soft">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${
                      ATTENDANCE_COLORS[attendanceLevel(attendance.percent)].bar
                    }`}
                    style={{ width: `${attendance.percent}%` }}
                  />
                </span>
              </div>
            </div>
          ) : null}

          {stats ? (
            <div className="rounded-2xl border border-rf-line bg-rf-card p-3.5">
              <WeekStreak
                trend={stats.trend}
                streak={streak}
                best={stats.longestStreak}
                bordered={false}
              />
            </div>
          ) : null}

          {nextUp ? (
            <MobileNextUpCard
              event={nextUp}
              currentUserId={currentUserId}
              now={now}
              onOpen={() => onOpenNextUp(nextUp)}
              onTestDevices={onTestDevices}
              className="mb-0"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
