"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface PastParticipant {
  userId: string;
  email?: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  quiet?: boolean;
  attended?: boolean;
  completed?: boolean;
}

export interface PastSession {
  id: string;
  start: string;
  end: string;
  durationMin: number;
  sessionType: string;
  name: string | null;
  status: string | null;
  ownerId: string;
  isOwner: boolean;
  participants: PastParticipant[];
  ownerInfo?: {
    email?: string;
    name?: string;
    firstname?: string;
    lastname?: string;
    username?: string;
  };
}

interface PastSessionsListProps {
  sessions: PastSession[];
  currentUserId: string;
  stats: {
    booked: number;
    attended: number;
    completed: number;
    minutes: number;
    withPartner: number;
  };
}

function getParticipantName(p: PastParticipant): string {
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

function formatRelativeDay(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const diffDays = Math.round(
    (startOfDay(today).getTime() - startOfDay(date).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year:
      date.getFullYear() === today.getFullYear() ? undefined : "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function formatTotalMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours}h ${mins}m`;
}

export function PastSessionsList({
  sessions,
  currentUserId,
  stats,
}: PastSessionsListProps) {
  const attendedSessions = sessions.filter((s) =>
    s.participants.some((p) => p.userId === currentUserId),
  );

  if (attendedSessions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          No past sessions yet
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Once you wrap up a session, it’ll show up here with all the details.
        </p>
      </div>
    );
  }

  // Group by day
  const grouped: { [key: string]: PastSession[] } = {};
  attendedSessions.forEach((s) => {
    const dateKey = formatRelativeDay(s.start);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(s);
  });

  return (
    <div className="space-y-8">
      <StatsRow stats={stats} />

      {Object.entries(grouped).map(([dateKey, daySessions]) => (
        <div key={dateKey}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {dateKey}
          </h2>
          <div className="space-y-3">
            {daySessions.map((session) => {
              const partner = session.participants.find(
                (p) => p.userId !== currentUserId,
              );
              const partnerName = partner ? getParticipantName(partner) : null;
              const me = session.participants.find(
                (p) => p.userId === currentUserId,
              );
              const wasSolo = session.participants.length < 2;
              const attended = Boolean(me?.attended);
              const completed = Boolean(me?.completed);
              const attendance: "missed" | "left-early" | "completed" = !attended
                ? "missed"
                : completed
                  ? "completed"
                  : "left-early";

              return (
                <div
                  key={session.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="min-w-[60px] text-center">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatTime(session.start)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {session.durationMin} min
                        </p>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {session.name || `${session.sessionType} session`}
                          </h3>
                          <AttendanceBadge attendance={attendance} />
                          {wasSolo && attended && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              Solo
                            </span>
                          )}
                          {me?.quiet && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Quiet mode
                            </span>
                          )}
                          {session.isOwner && (
                            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                              You hosted
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(session.start).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "Asia/Kolkata",
                          })}{" "}
                          · {session.sessionType}
                        </p>

                        {partner && (
                          <div className="mt-2 flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-[#FFF1D3] text-xs text-[#5D1C6A] dark:bg-[#5D1C6A] dark:text-[#FFB090]">
                                {getInitials(partnerName!)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              with{" "}
                              {partner.username ? (
                                <Link
                                  href={`/u/${partner.username}`}
                                  className="font-medium text-gray-900 hover:underline dark:text-gray-100"
                                >
                                  {partnerName}
                                </Link>
                              ) : (
                                <span className="font-medium">{partnerName}</span>
                              )}
                              {partner.quiet && (
                                <span className="ml-1 text-gray-400">
                                  (quiet mode)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/sessions/${session.id}`}
                      className="shrink-0 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsRow({
  stats,
}: {
  stats: {
    booked: number;
    attended: number;
    completed: number;
    minutes: number;
    withPartner: number;
  };
}) {
  const missed = Math.max(0, stats.booked - stats.attended);
  const attendancePct =
    stats.booked > 0 ? Math.round((stats.attended / stats.booked) * 100) : 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Completed"
        value={stats.completed.toString()}
        accent="from-[#5D1C6A]/15 to-[#CA5995]/15"
      />
      <StatCard
        label="Focused time"
        value={formatTotalMinutes(stats.minutes)}
        accent="from-[#FFF1D3] to-[#FFD8E8]/60 dark:from-[#5D1C6A]/30 dark:to-[#CA5995]/20"
      />
      <StatCard
        label="Attendance"
        value={stats.booked > 0 ? `${attendancePct}%` : "—"}
        accent="from-emerald-100/70 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10"
      />
      <StatCard
        label="Missed"
        value={missed.toString()}
        accent={
          missed > 0
            ? "from-red-100/80 to-red-50 dark:from-red-900/30 dark:to-red-900/10"
            : "from-gray-100/70 to-gray-50 dark:from-gray-800/40 dark:to-gray-900/30"
        }
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-gradient-to-br p-4 dark:border-gray-700 ${accent}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-300">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function AttendanceBadge({
  attendance,
}: {
  attendance: "missed" | "left-early" | "completed";
}) {
  if (attendance === "completed") {
    return (
      <span className="rounded-full bg-[#FFF1D3] px-2 py-0.5 text-xs font-medium text-[#5D1C6A] dark:bg-[#5D1C6A]/30 dark:text-[#CA5995]">
        Completed
      </span>
    );
  }
  if (attendance === "missed") {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Missed
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      Left early
    </span>
  );
}
