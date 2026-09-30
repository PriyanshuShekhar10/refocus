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

type Attendance = "missed" | "left-early" | "completed" | "unmatched";

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

/** Solo sessions cannot be joined — show Unmatched, not Missed. */
export function attendanceOf(
  me: PastParticipant | undefined,
  wasSolo: boolean,
): Attendance {
  if (wasSolo && !me?.attended) return "unmatched";
  if (!me?.attended) return "missed";
  if (me.completed) return "completed";
  return "left-early";
}

function attendanceLabel(a: Attendance): string {
  if (a === "completed") return "Completed";
  if (a === "missed") return "Missed";
  if (a === "unmatched") return "Unmatched";
  return "Left early";
}

function badgeClass(a: Attendance): string {
  if (a === "completed") return "bg-rf-cream-bg text-rf-plum-ink";
  if (a === "missed") return "bg-rf-miss-bg text-rf-miss-ink";
  if (a === "unmatched") return "bg-rf-line-soft text-rf-ink-mute";
  return "bg-rf-amber-bg text-rf-amber-ink";
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
      <div className="rounded-[14px] border border-rf-line bg-rf-card py-16 text-center">
        <p className="text-sm font-medium text-rf-ink">No focus history yet</p>
        <p className="mt-1 text-sm text-rf-ink-mute">
          Finished sessions will show up here.
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
    <div className="flex flex-col gap-6">
      <HistorySummary stats={stats} />

      {Object.entries(grouped).map(([dateKey, daySessions]) => (
        <section key={dateKey}>
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.05em] text-rf-ink-mute">
            {dateKey}
          </h2>
          <div className="divide-y divide-rf-line-soft rounded-[14px] border border-rf-line bg-rf-card px-[18px]">
            {daySessions.map((session) => {
              const partner = session.participants.find(
                (p) => p.userId !== currentUserId,
              );
              const partnerName = partner ? getParticipantName(partner) : null;
              const me = session.participants.find(
                (p) => p.userId === currentUserId,
              );
              const wasSolo = session.participants.length < 2;
              const attendance = attendanceOf(me, wasSolo);
              const title =
                session.name?.trim() ||
                (partnerName
                  ? `Focus with ${partnerName}`
                  : wasSolo
                    ? "Solo focus"
                    : `${session.sessionType} session`);
              const extras = [
                wasSolo ? "Solo" : null,
                session.isOwner ? "You hosted" : null,
                me?.quiet ? "Quiet mode" : null,
              ].filter(Boolean) as string[];

              return (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center gap-4 py-3.5"
                >
                  <div className="min-w-[74px] border-r border-rf-line pr-4">
                    <p className="font-rf-mono text-[15px] font-medium text-rf-ink">
                      {formatTime(session.start)}
                    </p>
                    <p className="text-xs text-rf-ink-mute">{session.durationMin} min</p>
                  </div>
                  <div className="min-w-0 flex-[1_1_220px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="mr-0.5 text-[14.5px] font-medium text-rf-ink">
                        {title}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass(attendance)}`}
                      >
                        {attendanceLabel(attendance)}
                      </span>
                      {extras.map((x) => (
                        <span
                          key={x}
                          className="rounded-full border border-rf-line px-2 py-px text-[11px] font-medium text-rf-ink-mute"
                        >
                          {x}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-rf-ink-mute">
                      <span>
                        {formatLocalDate(session.start, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        · {session.sessionType}
                      </span>
                      {partner && partnerName ? (
                        <>
                          <span>·</span>
                          <Avatar className="h-5 w-5">
                            {partner.avatarUrl ? (
                              <AvatarImage src={partner.avatarUrl} alt={partnerName} />
                            ) : null}
                            <AvatarFallback className="bg-rf-tint-sky text-[9px] font-medium text-rf-ink">
                              {getInitials(partnerName)}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            with{" "}
                            {partner.username ? (
                              <Link
                                href={`/u/${partner.username}`}
                                className="font-semibold text-rf-ink hover:underline"
                              >
                                {partnerName}
                              </Link>
                            ) : (
                              <span className="font-semibold text-rf-ink">{partnerName}</span>
                            )}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href={`/sessions/${session.id}`}
                    className="ml-auto inline-flex h-8 items-center whitespace-nowrap rounded-full border border-rf-line bg-rf-card px-3 text-[12.5px] font-medium text-rf-ink-soft transition-colors hover:border-rf-ink-mute hover:text-rf-ink"
                  >
                    View details
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ))}
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
    stats.booked > 0 ? Math.round((stats.attended / stats.booked) * 100) : null;
  const tiles = [
    { label: "Completed", value: String(stats.completed), dot: "var(--rf-h4)" },
    { label: "Focused time", value: formatTotalMinutes(stats.minutes), dot: "var(--rf-h3)" },
    {
      label: "Attendance",
      value: attendancePct === null ? "—" : `${attendancePct}%`,
      dot: "var(--rf-success)",
    },
    { label: "Missed", value: String(missed), dot: "var(--rf-danger)" },
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-[14px] border border-rf-line bg-rf-card px-[18px] py-4"
        >
          <div className="flex items-center gap-1.5 font-rf-mono text-[10.5px] uppercase tracking-[0.04em] text-rf-ink-mute">
            <span className="h-[7px] w-[7px] rounded-full" style={{ background: t.dot }} />
            {t.label}
          </div>
          <div className="mt-1.5 font-rf-mono text-2xl tracking-[-0.02em] text-rf-ink">
            {t.value}
          </div>
        </div>
      ))}
    </div>
  );
}
