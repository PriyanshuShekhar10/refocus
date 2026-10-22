"use client";

import type { CalendarEvent } from "@/types/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedName } from "@/components/verified-tag";
import { formatLocalTimeRange } from "@/lib/localTime";
import { isCallJoinable } from "@/lib/sessionWindow";
import { getOtherParticipants, participantDisplayName, formatStartsIn } from "./sessionUiState";

/** The prominent "next up" card from the design — distinct from the regular agenda rows. */
export function MobileNextUpCard({
  event,
  currentUserId,
  now,
  onOpen,
  onTestDevices,
  className = "mb-4",
}: {
  event: CalendarEvent;
  currentUserId: string | null;
  now: Date;
  onOpen: () => void;
  onTestDevices: () => void;
  className?: string;
}) {
  const partner = getOtherParticipants(event, currentUserId)[0];
  const partnerName = partner ? participantDisplayName(partner) : "Waiting for a partner";
  const initial = partnerName[0]?.toUpperCase() ?? "?";
  const joinable = isCallJoinable(event.start, event.end, now);
  const started = new Date(event.start).getTime() <= now.getTime();
  const whenLabel = started ? "In progress" : formatStartsIn(event.start, now);
  const timeRange = formatLocalTimeRange(event.start, event.end, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[20px] border-2 border-b-[5px] border-rf-primary bg-rf-next-bg p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-rf-primary-shadow">
          Next up
        </span>
        <span className="text-xs font-extrabold text-rf-primary-shadow">{whenLabel}</span>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-2.5 text-left"
      >
        <Avatar className="h-10 w-10 shrink-0 border-2 border-rf-card ring-2 ring-rf-primary">
          {partner?.avatar_url ? (
            <AvatarImage src={partner.avatar_url} alt={partnerName} />
          ) : null}
          <AvatarFallback className="bg-rf-cream-bg text-sm font-extrabold text-rf-ink">
            {initial}
          </AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-extrabold text-rf-ink">
            {partner ? (
              <VerifiedName name={partnerName} verified={partner.emailVerified} />
            ) : (
              partnerName
            )}
          </span>
          <span className="truncate text-[12.5px] text-rf-ink-soft">{timeRange}</span>
        </span>
      </button>

      <button
        type="button"
        onClick={joinable ? onOpen : undefined}
        disabled={!joinable}
        className="h-11 rounded-2xl bg-rf-primary text-[14px] font-extrabold uppercase tracking-[0.06em] text-rf-on-primary shadow-[0_4px_0_var(--rf-primary-shadow)] transition-[transform] duration-100 active:translate-y-1 active:shadow-none disabled:opacity-55 disabled:shadow-none"
      >
        {joinable ? "Join session" : "Not open yet"}
      </button>

      <button
        type="button"
        onClick={onTestDevices}
        className="h-9 rounded-xl border-2 border-b-4 border-rf-next-soft bg-rf-card text-[12.5px] font-bold text-rf-primary-shadow transition-[transform] duration-100 active:translate-y-[2px] active:border-b-2"
      >
        Test audio and video
      </button>
    </div>
  );
}
