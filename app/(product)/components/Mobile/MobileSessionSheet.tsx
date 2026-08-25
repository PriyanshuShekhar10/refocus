"use client";

import type { CalendarEvent } from "@/types/calendar";
import { VerifiedName } from "@/components/verified-tag";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLocalDate, formatLocalTimeRange } from "@/lib/localTime";
import {
  classifySessionUiState,
  getOtherParticipants,
  participantDisplayName,
} from "./sessionUiState";
import { useMobileAgendaColors } from "./mobileAgendaColors";

interface MobileSessionSheetProps {
  open: boolean;
  event: CalendarEvent | null;
  currentUserId: string | null;
  quiet: boolean;
  onChangeQuiet: (v: boolean) => void;
  onClose: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onManage: () => void;
}

export function MobileSessionSheet({
  open,
  event,
  currentUserId,
  quiet,
  onChangeQuiet,
  onClose,
  onJoin,
  onLeave,
  onManage,
}: MobileSessionSheetProps) {
  const agenda = useMobileAgendaColors();
  if (!open || !event) return null;

  const state = classifySessionUiState(event, currentUserId);
  const others = getOtherParticipants(event, currentUserId);
  const dateLabel = formatLocalDate(event.start, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeRange = formatLocalTimeRange(event.start, event.end, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-[55] lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close session details"
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl shadow-2xl"
        style={{
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
          backgroundColor: agenda.elevated,
          borderTop: `1px solid ${agenda.border}`,
          color: agenda.text,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Session details"
      >
        <div className="flex justify-center py-3">
          <div
            className="h-1 w-10 rounded-full"
            style={{ backgroundColor: agenda.border }}
          />
        </div>

        <div className="space-y-4 px-4 pb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: agenda.text }}>
              {event.durationMin}-minute session
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: agenda.textSecondary }}
            >
              {dateLabel}
            </p>
            <p
              className="text-sm font-medium"
              style={{ color: agenda.textSecondary }}
            >
              {timeRange}
            </p>
          </div>

          {others.length > 0 && (
            <ul className="space-y-2">
              {others.map((p) => {
                const name = participantDisplayName(p);
                return (
                  <li key={p.user_id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {p.avatar_url ? (
                        <AvatarImage src={p.avatar_url} alt={name} />
                      ) : null}
                      <AvatarFallback
                        className="text-xs"
                        style={{
                          backgroundColor: agenda.avatarFallbackBg,
                          color: agenda.avatarFallbackText,
                        }}
                      >
                        {name[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className="text-sm font-medium"
                      style={{ color: agenda.text }}
                    >
                      <VerifiedName name={name} verified={p.emailVerified} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {state === "available" && (
            <>
              <label
                className="flex min-h-11 items-center gap-3 text-sm"
                style={{ color: agenda.textSecondary }}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  style={{ accentColor: agenda.plum }}
                  checked={quiet}
                  onChange={(e) => onChangeQuiet(e.target.checked)}
                />
                Quiet session (start muted)
              </label>
              <button
                type="button"
                onClick={onJoin}
                className="min-h-12 w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#5F2066]"
                style={{ backgroundColor: agenda.plumCta }}
              >
                Join session
              </button>
            </>
          )}

          {state === "joined" && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onManage}
                className="min-h-12 w-full rounded-xl border py-3.5 text-sm font-semibold transition-colors"
                style={{
                  borderColor: agenda.border,
                  color: agenda.text,
                  backgroundColor: agenda.card,
                }}
              >
                View details
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="min-h-12 w-full rounded-xl bg-red-600/90 py-3.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                Leave session
              </button>
            </div>
          )}

          {state === "yours" && (
            <button
              type="button"
              onClick={onManage}
              className="min-h-12 w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#5F2066]"
              style={{ backgroundColor: agenda.plumCta }}
            >
              Manage session
            </button>
          )}

          {state === "past" && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 w-full rounded-xl border py-3.5 text-sm font-semibold"
              style={{
                borderColor: agenda.border,
                color: agenda.textSecondary,
                backgroundColor: agenda.card,
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
