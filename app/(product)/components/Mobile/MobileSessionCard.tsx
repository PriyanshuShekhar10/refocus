"use client";

import type { CSSProperties } from "react";
import type { CalendarEvent } from "@/types/calendar";
import { VerifiedName } from "@/components/verified-tag";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLocalTime } from "@/lib/localTime";
import {
  classifySessionUiState,
  formatStartsIn,
  getOtherParticipants,
  participantDisplayName,
  type SessionUiState,
} from "./sessionUiState";
import {
  type AgendaColors,
  useMobileAgendaColors,
} from "./mobileAgendaColors";

function PeopleRow({
  event,
  currentUserId,
  state,
  agenda,
}: {
  event: CalendarEvent;
  currentUserId: string | null;
  state: SessionUiState;
  agenda: AgendaColors;
}) {
  const others = getOtherParticipants(event, currentUserId);
  const participantCount = event.participants?.length ?? 0;

  if (state === "yours") {
    if (participantCount >= 2 && others[0]) {
      const name = participantDisplayName(others[0]);
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 shrink-0">
            {others[0].avatar_url ? (
              <AvatarImage src={others[0].avatar_url} alt={name} />
            ) : null}
            <AvatarFallback
              className="text-[10px]"
              style={{
                backgroundColor: agenda.avatarFallbackBg,
                color: agenda.avatarFallbackText,
              }}
            >
              {name[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span
            className="truncate text-sm"
            style={{ color: agenda.textSecondary }}
          >
            <VerifiedName name={name} verified={others[0].emailVerified} />
            {others.length > 1 ? ` +${others.length - 1}` : ""}
          </span>
        </div>
      );
    }
    return (
      <p className="text-sm" style={{ color: agenda.textSecondary }}>
        {participantCount <= 1
          ? "Waiting for match"
          : `${participantCount} attending`}
      </p>
    );
  }

  if (state === "available") {
    const owner = event.owner;
    const ownerAsParticipant = (event.participants ?? []).find(
      (p) => p.user_id === event.owner_id,
    );
    const name = owner
      ? [owner.firstname, owner.lastname].filter(Boolean).join(" ") ||
        owner.username ||
        "Host"
      : ownerAsParticipant
        ? participantDisplayName(ownerAsParticipant)
        : "Available";
    const avatarUrl = owner?.avatar_url ?? ownerAsParticipant?.avatar_url;
    const extra = Math.max(0, participantCount - 1);

    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7 shrink-0">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
          <AvatarFallback
            className="text-[10px]"
            style={{
              backgroundColor: agenda.avatarFallbackBg,
              color: agenda.avatarFallbackText,
            }}
          >
            {name[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <span
          className="truncate text-sm"
          style={{ color: agenda.textSecondary }}
        >
          {name}
          {extra > 0 ? ` +${extra}` : ""}
        </span>
      </div>
    );
  }

  if (others.length === 0) {
    return (
      <p className="text-sm" style={{ color: agenda.textSecondary }}>
        {participantCount} attending
      </p>
    );
  }

  const primary = others[0];
  const name = participantDisplayName(primary);
  const extra = others.length - 1;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {others.slice(0, 2).map((p) => {
          const n = participantDisplayName(p);
          return (
            <Avatar
              key={p.user_id}
              className="h-7 w-7 border-2"
              style={{ borderColor: agenda.card }}
            >
              {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={n} /> : null}
              <AvatarFallback
                className="text-[10px]"
                style={{
                  backgroundColor: agenda.avatarFallbackBg,
                  color: agenda.avatarFallbackText,
                }}
              >
                {n[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      <span
        className="truncate text-sm"
        style={{ color: agenda.textSecondary }}
      >
        <VerifiedName name={name} verified={primary.emailVerified} />
        {extra > 0 ? ` +${extra}` : ""}
      </span>
    </div>
  );
}

function getCardStyle(
  state: SessionUiState,
  agenda: AgendaColors,
  highlighted: boolean,
): CSSProperties {
  const style: CSSProperties = {
    backgroundColor: agenda.card,
    borderColor: agenda.border,
    borderWidth: 1,
    borderStyle: "solid",
  };

  if (highlighted) {
    style.boxShadow = `0 0 0 2px ${agenda.ringOffset}, 0 0 0 4px color-mix(in srgb, ${agenda.sage} 70%, transparent)`;
  }

  switch (state) {
    case "available":
      style.borderLeftWidth = 2;
      style.borderLeftColor = agenda.plum;
      break;
    case "joined":
      style.borderLeftWidth = 2;
      style.borderLeftColor = agenda.sage;
      break;
    case "past":
      style.backgroundColor = agenda.page;
      style.opacity = 0.65;
      break;
  }

  return style;
}

interface MobileSessionCardProps {
  event: CalendarEvent;
  currentUserId: string | null;
  now?: Date;
  isNextUp?: boolean;
  highlighted?: boolean;
  onPress: () => void;
}

export function MobileSessionCard({
  event,
  currentUserId,
  now = new Date(),
  isNextUp = false,
  highlighted = false,
  onPress,
}: MobileSessionCardProps) {
  const agenda = useMobileAgendaColors();
  const state = classifySessionUiState(event, currentUserId, now);
  const timeLabel = formatLocalTime(event.start, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full min-h-[44px] rounded-xl p-3.5 text-left transition-colors active:scale-[0.99]"
      style={getCardStyle(state, agenda, highlighted)}
    >
      {isNextUp && (
        <p
          className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: agenda.textSecondary }}
        >
          Next up
        </p>
      )}
      <p
        className="text-sm font-semibold"
        style={{
          color: state === "past" ? agenda.textMuted : agenda.text,
        }}
      >
        {timeLabel} · {event.durationMin} min
      </p>
      <div className="mt-2">
        <PeopleRow
          event={event}
          currentUserId={currentUserId}
          state={state}
          agenda={agenda}
        />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {state === "available" && (
          <>
            <span
              className="text-sm font-medium"
              style={{ color: agenda.plumMuted }}
            >
              • Available
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: agenda.plumBright }}
            >
              Join →
            </span>
          </>
        )}
        {state === "joined" && (
          <span
            className="text-sm font-semibold"
            style={{ color: agenda.sage }}
          >
            ✓ Joined
          </span>
        )}
        {state === "yours" && (
          <>
            <span
              className="text-sm font-medium"
              style={{ color: agenda.textSecondary }}
            >
              Yours
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: agenda.text }}
            >
              Manage
            </span>
          </>
        )}
        {state === "past" && (
          <span
            className="text-sm font-medium"
            style={{ color: agenda.textMuted }}
          >
            Past
          </span>
        )}
      </div>
      {isNextUp && state !== "past" && (
        <p
          className="mt-1.5 text-xs"
          style={{ color: agenda.textSecondary }}
        >
          {formatStartsIn(event.start, now)}
        </p>
      )}
    </button>
  );
}
