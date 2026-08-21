"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLocalDate, formatLocalTime } from "@/lib/localTime";

export interface PastParticipant {
  userId: string;
  email?: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  avatarUrl?: string | null;
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

type Attendance = "missed" | "left-early" | "completed";

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

  return formatLocalDate(date, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function formatTime(dateStr: string): string {
  return formatLocalTime(dateStr, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTotalMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours}h ${mins}m`;
}

function attendanceOf(
  me: PastParticipant | undefined,
): Attendance {
  if (!me?.attended) return "missed";
  if (me.completed) return "completed";
  return "left-early";
}

function attendanceLabel(a: Attendance): string {
  if (a === "completed") return "Completed";
  if (a === "missed") return "Missed";
  return "Left early";
}

function dotClass(a: Attendance): string {
  if (a === "completed") return "bg-[#5D1C6A] dark:bg-[#CA5995]";
  if (a === "missed") return "bg-red-400";
  return "bg-amber-400";
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
      <div className="py-16 text-center">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          No focus history yet
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Finished sessions appear here as a quiet timeline — not booking cards.
        </p>
      </div>
    );
  }

  const grouped: { [key: string]: PastSession[] } = {};
  attendedSessions.forEach((s) => {
    const dateKey = formatRelativeDay(s.start);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(s);
  });

  return (
    <div className="space-y-10">
      <HistorySummary stats={stats} />

      <div className="space-y-10">
        {Object.entries(grouped).map(([dateKey, daySessions]) => (
          <section key={dateKey}>
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
              {dateKey}
            </h2>

            <ol className="relative ml-3 border-l border-gray-200 pl-6 dark:border-gray-700 sm:ml-4 sm:pl-8">
              {daySessions.map((session) => {
                const partner = session.participants.find(
                  (p) => p.userId !== currentUserId,
                );
                const partnerName = partner
                  ? getParticipantName(partner)
                  : null;
                const me = session.participants.find(
                  (p) => p.userId === currentUserId,
                );
                const wasSolo = session.participants.length < 2;
                const attendance = attendanceOf(me);
                const title =
                  session.name?.trim() ||
                  (partnerName
                    ? `Focus with ${partnerName}`
                    : wasSolo
                      ? "Solo focus"
                      : `${session.sessionType} session`);

                return (
                  <li key={session.id} className="relative pb-8 last:pb-0">
                    <span
                      aria-hidden
                      className={`absolute -left-[1.9rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:-left-[2.15rem] dark:ring-gray-950 sm:-left-[2.4rem] ${dotClass(attendance)}`}
                    />

                    <Link
                      href={`/sessions/${session.id}`}
                      className="group block rounded-lg outline-none transition-colors hover:bg-gray-50/80 focus-visible:ring-2 focus-visible:ring-[#5D1C6A]/40 dark:hover:bg-gray-900/50"
                    >
                      <div className="flex items-start gap-3 px-2 py-1.5 sm:gap-4">
                        {partner ? (
                          <Avatar className="mt-0.5 h-10 w-10 shrink-0">
                            {partner.avatarUrl ? (
                              <AvatarImage
                                src={partner.avatarUrl}
                                alt={partnerName!}
                              />
                            ) : null}
                            <AvatarFallback className="bg-[#FFF1D3] text-sm text-[#5D1C6A] dark:bg-[#5D1C6A] dark:text-[#FFB090]">
                              {getInitials(partnerName!)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            Solo
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <p className="truncate text-[15px] font-medium text-gray-900 group-hover:text-[#5D1C6A] dark:text-gray-100 dark:group-hover:text-[#CA5995]">
                              {title}
                            </p>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {attendanceLabel(attendance)}
                            </span>
                          </div>

                          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                            {formatTime(session.start)}
                            <span className="mx-1.5 text-gray-300 dark:text-gray-600">
                              ·
                            </span>
                            {session.durationMin} min
                            <span className="mx-1.5 text-gray-300 dark:text-gray-600">
                              ·
                            </span>
                            {session.sessionType}
                            {me?.quiet ? (
                              <>
                                <span className="mx-1.5 text-gray-300 dark:text-gray-600">
                                  ·
                                </span>
                                Quiet
                              </>
                            ) : null}
                            {session.isOwner ? (
                              <>
                                <span className="mx-1.5 text-gray-300 dark:text-gray-600">
                                  ·
                                </span>
                                Hosted
                              </>
                            ) : null}
                          </p>

                          {partner?.username ? (
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              @{partner.username}
                            </p>
                          ) : null}
                        </div>

                        <span
                          aria-hidden
                          className="mt-2 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600"
                        >
                          →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function HistorySummary({
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
    <div className="flex flex-wrap items-end gap-x-8 gap-y-3 border-b border-gray-100 pb-6 dark:border-gray-800">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
          Focus history
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          {formatTotalMinutes(stats.minutes)}
          <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
            completed
          </span>
        </p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
        <span>
          <strong className="font-semibold text-gray-900 dark:text-white">
            {stats.completed}
          </strong>{" "}
          done
        </span>
        <span>
          <strong className="font-semibold text-gray-900 dark:text-white">
            {stats.booked > 0 ? `${attendancePct}%` : "—"}
          </strong>{" "}
          attendance
        </span>
        <span>
          <strong className="font-semibold text-gray-900 dark:text-white">
            {stats.withPartner}
          </strong>{" "}
          with a partner
        </span>
        {missed > 0 ? (
          <span className="text-red-600/80 dark:text-red-400/80">
            <strong className="font-semibold">{missed}</strong> missed
          </span>
        ) : null}
      </div>
    </div>
  );
}
