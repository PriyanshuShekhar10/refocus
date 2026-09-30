"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Video } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { mutate as globalMutate } from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLocalDate, formatLocalTime } from "@/lib/localTime";
import { isCallJoinable } from "@/lib/sessionWindow";
import * as sessionsApi from "@/lib/api/sessionsApi";
import { swrKeys } from "@/lib/swr/keys";

const ConfirmModal = dynamic(
  () =>
    import("@/app/(product)/components/Calendar/Modals/ConfirmModal").then(
      (m) => m.ConfirmModal,
    ),
  { ssr: false },
);

interface Participant {
  userId: string;
  email?: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  avatarUrl?: string | null;
  quiet?: boolean;
}

interface Session {
  id: string;
  start: string;
  end: string;
  durationMin: number;
  sessionType: string;
  name: string | null;
  status: string | null;
  ownerId: string;
  isOwner: boolean;
  participants: Participant[];
  ownerInfo?: {
    email?: string;
    name?: string;
    firstname?: string;
    lastname?: string;
    username?: string;
    avatarUrl?: string | null;
  };
}

interface SessionsListProps {
  sessions: Session[];
  currentUserId: string;
}

function isJoinable(startTime: string, endTime: string): boolean {
  return isCallJoinable(startTime, endTime);
}

function getTimeUntil(startTime: string): string {
  const now = new Date();
  const start = new Date(startTime);
  const diff = start.getTime() - now.getTime();

  if (diff <= 0) return "Now";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days} day${days > 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }
  return `in ${minutes}m`;
}

function formatDateTime(dateStr: string): { date: string; time: string } {
  return {
    date: formatLocalDate(dateStr, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: formatLocalTime(dateStr, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function getParticipantName(p: Participant): string {
  if (p.firstname || p.lastname) {
    return [p.firstname, p.lastname].filter(Boolean).join(" ");
  }
  if (p.name) return p.name;
  if (p.email) return p.email.split("@")[0];
  return "Unknown";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

export function SessionsList({ sessions, currentUserId }: SessionsListProps) {
  const router = useRouter();
  const [, setTick] = useState(0);
  const [leaveTarget, setLeaveTarget] = useState<Session | null>(null);
  const [visibleSessions, setVisibleSessions] = useState(sessions);

  useEffect(() => {
    setVisibleSessions(sessions);
  }, [sessions]);

  // Update every minute to refresh "time until" and joinability
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const partnerForLeave = leaveTarget
    ? leaveTarget.participants.find((p) => p.userId !== currentUserId)
    : null;
  const partnerNameForLeave = partnerForLeave
    ? getParticipantName(partnerForLeave)
    : null;

  const handleLeave = async (message?: string) => {
    if (!leaveTarget) return;
    const result = await sessionsApi.leave(leaveTarget.id, message);
    if (!result.ok) {
      throw new Error(result.error);
    }
    setVisibleSessions((prev) => prev.filter((s) => s.id !== leaveTarget.id));
    setLeaveTarget(null);
    void globalMutate(swrKeys.sessionsMineUpcoming);
    void globalMutate(swrKeys.sessionsMine);
    router.refresh();
  };

  if (visibleSessions.length === 0) {
    return (
      <div className="rounded-[14px] border border-rf-line bg-rf-card py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rf-line-soft">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rf-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-rf-ink">No upcoming sessions</h3>
        <p className="mt-1 text-sm text-rf-ink-mute">
          Book a session from the calendar to get started
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-rf-primary px-4 text-[13px] font-medium text-rf-on-primary transition-colors hover:bg-rf-primary-hover"
        >
          Go to Calendar
        </Link>
      </div>
    );
  }

  // Group sessions by date
  const groupedSessions: { [key: string]: Session[] } = {};
  visibleSessions.forEach((s) => {
    const dateKey = formatLocalDate(s.start, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!groupedSessions[dateKey]) {
      groupedSessions[dateKey] = [];
    }
    groupedSessions[dateKey].push(s);
  });

  const todayKey = formatLocalDate(new Date(), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(groupedSessions).map(([dateKey, daySessions]) => (
        <div key={dateKey}>
          <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-rf-ink-mute">
            {dateKey}
            {dateKey === todayKey ? (
              <span className="rounded-full bg-rf-primary px-2 py-px text-[10px] tracking-[0.04em] text-rf-on-primary">
                Today
              </span>
            ) : null}
          </h2>
          <div className="flex flex-col gap-2.5">
            {daySessions.map((session) => {
              const { time } = formatDateTime(session.start);
              const joinable = isJoinable(session.start, session.end);
              const timeUntil = getTimeUntil(session.start);
              const isBooked = session.participants.length >= 2;
              const live = joinable && isBooked;

              // Find partner (the other participant)
              const partner = session.participants.find(
                (p) => p.userId !== currentUserId
              );
              const partnerName = partner ? getParticipantName(partner) : null;

              return (
                <div
                  key={session.id}
                  className={`flex flex-wrap items-center gap-4 rounded-[14px] border bg-rf-card px-[18px] py-4 transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,.06)] ${
                    live
                      ? "border-rf-rose/60 shadow-[0_0_0_3px_color-mix(in_srgb,var(--rf-rose)_14%,transparent)]"
                      : "border-rf-line"
                  }`}
                >
                  <div className="min-w-[74px] border-r border-rf-line pr-4">
                    <p className="font-rf-mono text-[17px] font-medium tracking-[-0.02em] text-rf-ink">
                      {time}
                    </p>
                    <p className="text-xs text-rf-ink-mute">{session.durationMin} min</p>
                  </div>

                  <div className="min-w-0 flex-[1_1_220px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-medium text-rf-ink">
                        {session.name || `${session.sessionType} session`}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isBooked
                            ? "bg-rf-cream-bg text-rf-plum-ink"
                            : "bg-rf-amber-bg text-rf-amber-ink"
                        }`}
                      >
                        {isBooked ? "Booked" : "Waiting for partner"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-rf-ink-mute">
                      {session.isOwner ? "You're hosting" : "You're joining"} •{" "}
                      {session.sessionType}
                    </p>
                    {isBooked && partner && (
                      <div className="mt-2 flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {partner.avatarUrl ? (
                            <AvatarImage src={partner.avatarUrl} alt={partnerName!} />
                          ) : null}
                          <AvatarFallback className="bg-rf-tint-blush text-[10px] font-medium text-rf-ink">
                            {getInitials(partnerName!)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] text-rf-ink-soft">
                          with <span className="font-semibold text-rf-ink">{partnerName}</span>
                          {partner.quiet && (
                            <span className="ml-1 text-rf-ink-mute">(quiet mode)</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-2.5">
                    {live ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 font-rf-mono text-[11.5px] text-rf-online">
                          <span className="h-[7px] w-[7px] rounded-full bg-rf-online" />
                          Live now
                        </span>
                        <Link
                          href={`/sessions/${session.id}`}
                          className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-rf-primary px-4 text-[13px] font-medium text-rf-on-primary transition-colors hover:bg-rf-primary-hover"
                        >
                          <Video className="h-3.5 w-3.5" aria-hidden />
                          Join now
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="font-rf-mono text-xs text-rf-ink-mute">
                          {timeUntil}
                        </span>
                        <Link
                          href={`/sessions/${session.id}`}
                          className="inline-flex h-[34px] items-center whitespace-nowrap rounded-full border border-rf-line bg-rf-card px-3.5 text-[13px] font-medium text-rf-ink transition-colors hover:border-rf-ink-mute"
                        >
                          View details
                        </Link>
                      </>
                    )}
                    {!session.isOwner ? (
                      <button
                        type="button"
                        onClick={() => setLeaveTarget(session)}
                        className="inline-flex h-[34px] items-center whitespace-nowrap rounded-full border border-rf-warn px-3.5 text-[13px] font-medium text-rf-warn transition-colors hover:bg-rf-warn-soft"
                      >
                        Leave
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {leaveTarget ? (
        <ConfirmModal
          title="Leave session"
          description="Leave this session? The slot will be available for someone else."
          confirmText="Leave session"
          cancelText="Cancel"
          confirmVariant="danger"
          messageField={
            partnerNameForLeave
              ? {
                  label: `Leave a note for ${partnerNameForLeave} (optional, emailed)`,
                  placeholder: "Something came up — sorry!",
                }
              : false
          }
          onCancel={() => setLeaveTarget(null)}
          onConfirm={handleLeave}
        />
      ) : null}
    </div>
  );
}
