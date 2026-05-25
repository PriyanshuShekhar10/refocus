"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { CalendarEvent } from "@/types/calendar";
import { getResolvedSessionColor } from "@/constants/calendar";
import { getLocalSessionColor } from "@/lib/sessionColors";
import { isCallJoinable } from "@/lib/sessionWindow";
import { VerifiedName } from "@/components/verified-tag";

const COMPACT_PASTEL_COLORS_LIGHT = [
  { bg: "#FCE7F3", border: "#F9A8D4" }, // pink
  { bg: "#EDE9FE", border: "#C4B5FD" }, // lavender
  { bg: "#DCFCE7", border: "#86EFAC" }, // green
  { bg: "#FEF3C7", border: "#FCD34D" }, // amber
  { bg: "#F3E8FF", border: "#D8B4FE" }, // violet
  { bg: "#CCFBF1", border: "#5EEAD4" }, // teal
];

const COMPACT_PASTEL_COLORS_DARK = [
  { bg: "#4C1D95AA", border: "#A78BFA" }, // violet
  { bg: "#581C87AA", border: "#C4B5FD" }, // lavender
  { bg: "#14532DAA", border: "#4ADE80" }, // green
  { bg: "#78350FAA", border: "#FBBF24" }, // amber
  { bg: "#831843AA", border: "#F472B6" }, // pink
  { bg: "#134E4AAA", border: "#2DD4BF" }, // teal
];

/** Check if the session is joinable right now — matches API-enforced window. */
function isJoinable(startTime: Date | string, endTime?: Date | string): boolean {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);
  return isCallJoinable(start, end);
}

interface CalendarEventCardProps {
  event: CalendarEvent;
  isBooked: boolean;
  isOwner: boolean;
  otherQuiet: boolean;
  tooltip: { label: string; email?: string } | null;
  top: number;
  height: number;
  /** When true, show as small box (available slot not created by me); when false, full-width card */
  isCompact: boolean;
  /** Horizontal stack index for overlapping compact slots */
  compactStackIndex?: number;
  /** Total overlapping compact slots in this stack group */
  compactStackTotal?: number;
  onBook: (e: React.MouseEvent) => void;
  onDetails: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  /** When provided and user is participant (booked, not owner), shows Leave button */
  onLeave?: () => void;
  /** Open the partner preview in dashboard sidebar instead of navigating away */
  onPreviewProfile?: (profile: {
    username: string;
    name: string;
    about?: string | null;
    avatarUrl?: string | null;
    emailVerified?: boolean;
  }) => void;
}

export function CalendarEventCard({
  event,
  isBooked,
  isOwner,
  otherQuiet,
  tooltip,
  top,
  height,
  isCompact,
  compactStackIndex = 0,
  compactStackTotal = 1,
  onBook,
  onDetails,
  onDelete,
  onLeave,
  onPreviewProfile,
}: CalendarEventCardProps) {
  const s = new Date(event.start);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const localColor = getLocalSessionColor(event.id);
  const storedColor =
    localColor !== undefined ? (localColor || null) : (event.color || null);
  const resolvedColor = getResolvedSessionColor(storedColor, isDark);
  const hasCustomColor = Boolean(resolvedColor);

  // Track if session is joinable (within 1 hour of start or in progress)
  const [canJoin, setCanJoin] = useState(() => isJoinable(event.start, event.end));
  const [showCompactPartnerCard, setShowCompactPartnerCard] = useState(false);
  const hidePartnerCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    // Re-check joinability every 30 seconds
    const check = () => setCanJoin(isJoinable(event.start, event.end));
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [event.start, event.end]);

  useEffect(() => {
    return () => {
      if (hidePartnerCardTimeoutRef.current) {
        clearTimeout(hidePartnerCardTimeoutRef.current);
      }
    };
  }, []);

  const timeLabel = s.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });

  const compactPartner = (() => {
    const ownerName = [event.owner?.firstname, event.owner?.lastname]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (event.owner && ownerName) {
    return {
      name: ownerName,
      username: event.owner.username ?? null,
      about: event.owner.about ?? null,
      avatar_url: event.owner.avatar_url ?? null,
      emailVerified: event.owner.emailVerified,
    };
    }

    const firstParticipant = event.participants?.[0];
    if (!firstParticipant) return null;
    const participantName = [firstParticipant.firstname, firstParticipant.lastname]
      .filter(Boolean)
      .join(" ")
      .trim();
    return {
      name: participantName || "Partner",
      username: firstParticipant.username ?? null,
      about: firstParticipant.about ?? null,
      avatar_url: firstParticipant.avatar_url ?? null,
      emailVerified: firstParticipant.emailVerified,
    };
  })();

  const compactPartnerInitials = compactPartner?.name
    ? compactPartner.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "P";

  const compactPalette = isDark
    ? COMPACT_PASTEL_COLORS_DARK
    : COMPACT_PASTEL_COLORS_LIGHT;
  const compactColorIndex = Math.abs(
    Array.from(event.id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  ) % compactPalette.length;
  const compactColor = compactPalette[compactColorIndex];

  const openCompactPartnerCard = () => {
    if (hidePartnerCardTimeoutRef.current) {
      clearTimeout(hidePartnerCardTimeoutRef.current);
      hidePartnerCardTimeoutRef.current = null;
    }
    setShowCompactPartnerCard(true);
  };

  const hideCompactPartnerCard = () => {
    if (hidePartnerCardTimeoutRef.current) {
      clearTimeout(hidePartnerCardTimeoutRef.current);
    }
    hidePartnerCardTimeoutRef.current = setTimeout(() => {
      setShowCompactPartnerCard(false);
    }, 120);
  };

  if (isCompact) {
    const stackTotal = Math.max(1, Math.min(compactStackTotal, 3));
    const stackIndex = Math.max(0, Math.min(compactStackIndex, stackTotal - 1));
    const laneWidthPx =
      stackTotal === 1 ? 44 : stackTotal === 2 ? 72 : 90;
    const gapPx = 4;
    const compactWidthPx = Math.max(
      24,
      Math.floor((laneWidthPx - gapPx * (stackTotal - 1)) / stackTotal)
    );
    const compactLeftPx = 2 + stackIndex * (compactWidthPx + gapPx);

    return (
      <div
        className={`absolute rounded-md border cursor-pointer flex flex-col items-center justify-center gap-0.5 transition-all duration-150 hover:brightness-95 overflow-visible shadow-sm ${
          showCompactPartnerCard ? "z-[120]" : "z-20"
        }`}
        style={{
          top,
          height,
          left: compactLeftPx,
          width: compactWidthPx,
          backgroundColor: compactColor.bg,
          borderColor: compactColor.border,
        }}
        title={`${timeLabel} • ${event.durationMin} min • Click to book`}
        onMouseEnter={openCompactPartnerCard}
        onMouseLeave={hideCompactPartnerCard}
        onClick={(evt) => {
          evt.stopPropagation();
          onBook(evt);
        }}
      >
        <Avatar className="h-4 w-4 border border-white dark:border-gray-700 shrink-0">
          {compactPartner?.avatar_url ? (
            <AvatarImage src={compactPartner.avatar_url} alt={compactPartner.name} />
          ) : null}
          <AvatarFallback className="text-[8px] font-medium bg-[#FFF1D3] text-[#5D1C6A]">
            {compactPartnerInitials}
          </AvatarFallback>
        </Avatar>
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 tabular-nums">
          {timeLabel}
        </span>

        {compactPartner && (
          <div
            className={`pointer-events-auto absolute left-[calc(100%+10px)] top-1/2 z-[130] w-60 -translate-y-1/2 rounded-xl border border-[#FFB090]/80 dark:border-[#CA5995]/60 bg-white/95 dark:bg-gray-900/95 p-3 shadow-2xl backdrop-blur-sm transition-all duration-150 ${
              showCompactPartnerCard
                ? "opacity-100 translate-x-0 visible"
                : "opacity-0 -translate-x-1 invisible"
            }`}
            onMouseEnter={openCompactPartnerCard}
            onMouseLeave={hideCompactPartnerCard}
            onMouseDown={(evt) => evt.stopPropagation()}
            onClick={(evt) => evt.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border border-[#FFB090]/70 dark:border-[#CA5995]/70">
                {compactPartner.avatar_url ? (
                  <AvatarImage
                    src={compactPartner.avatar_url}
                    alt={compactPartner.name}
                  />
                ) : null}
                <AvatarFallback className="text-[10px] font-semibold bg-[#FFF1D3] dark:bg-slate-800 text-[#5D1C6A] dark:text-[#FFB090]">
                  {compactPartnerInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                  <VerifiedName
                    name={compactPartner.name}
                    verified={compactPartner.emailVerified}
                  />
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Potential focus partner
                </p>
              </div>
            </div>
            <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
              {compactPartner.about?.trim() ||
                "Focused member. Open profile to learn more."}
            </p>
            {compactPartner.username ? (
              <button
                type="button"
                className="pointer-events-auto mt-2 inline-flex w-full justify-center rounded-lg bg-[#5D1C6A] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[#CA5995]"
                onMouseDown={(evt) => evt.stopPropagation()}
                onClick={(evt) => {
                  evt.stopPropagation();
                  if (!compactPartner.username) return;
                  if (onPreviewProfile) {
                    onPreviewProfile({
                      username: compactPartner.username,
                      name: compactPartner.name,
                      about: compactPartner.about,
                      avatarUrl: compactPartner.avatar_url,
                      emailVerified: compactPartner.emailVerified,
                    });
                    return;
                  }
                  window.location.href = `/u/${compactPartner.username}`;
                }}
              >
                View profile
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="mt-2 inline-flex w-full cursor-not-allowed justify-center rounded-lg bg-gray-300 dark:bg-gray-700 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300"
                onMouseDown={(evt) => evt.stopPropagation()}
                onClick={(evt) => evt.stopPropagation()}
              >
                Profile unavailable
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Determine if this is a short card (25 min = ~46px height)
  const isShortCard = height < 70;

  const isJoinableNow = isBooked && canJoin;

  return (
    <div className="absolute inset-x-2 z-20" style={{ top }}>
      <div
        style={{
          height,
          ...(hasCustomColor ? { backgroundColor: resolvedColor! } : {}),
        }}
        className={`relative group rounded-lg p-2 flex flex-col justify-between shadow-sm overflow-hidden border ${
          hasCustomColor
            ? "border-transparent"
            : isBooked
              ? "border-gray-200/80 dark:border-gray-500/50 bg-gray-200 dark:bg-gray-600"
              : "border-[#FFB090]/90 dark:border-[#CA5995]/45 bg-[#FFF1D3] dark:bg-slate-800/90 hover:border-[#CA5995] dark:hover:border-[#CA5995]/80 cursor-pointer"
        } ${
          isJoinableNow
            ? "border-[#CA5995] ring-2 ring-[#CA5995]/45 shadow-md"
            : ""
        } ${!hasCustomColor ? "" : "border-black/10 dark:border-white/10"}`}
        title={
          tooltip
            ? `${tooltip.label}${tooltip.email ? `\n${tooltip.email}` : ""}`
            : undefined
        }
        onClick={(evt) => {
          evt.stopPropagation();
          if (!isBooked && !isOwner) onBook(evt);
          else onDetails(evt);
        }}
      >
        {/* Action button - top right corner */}
        {isOwner ? (
          <button
            className="absolute top-1 right-1 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            title="Delete session"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : !isBooked ? (
          <button
            className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#5D1C6A] text-white hover:bg-[#CA5995] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onBook(e);
            }}
          >
            Book
          </button>
        ) : onLeave && !canJoin ? (
          <button
            className="absolute top-1 right-1 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onLeave();
            }}
            title="Leave session"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : null}

        <div className={`${canJoin && isBooked ? "pr-8" : "pr-8"}`}>
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
            {s.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Asia/Kolkata",
            })}
          </p>
          <p
            className={`font-semibold leading-tight ${
              isShortCard
                ? "text-[10px]"
                : "text-xs"
            } ${
              isBooked
                ? "text-gray-900 dark:text-white"
                : "text-gray-800 dark:text-white"
            }`}
          >
            {(() => {
              const primaryLabel = isOwner
                ? "Your session"
                : event.name || (isBooked ? "Session" : "Partner needed");
              return `${event.durationMin} min • ${primaryLabel}`;
            })()}
          </p>
        </div>

        {!isShortCard && (
          <div className="flex items-center justify-between mt-1">
            <span
              className={`text-xs font-medium ${
                isBooked
                  ? "text-gray-800 dark:text-[#FFB090]"
                  : "text-[#5D1C6A] dark:text-[#CA5995]"
              }`}
            >
              {event.name || (isBooked ? "Session" : "Partner needed")}
            </span>
            {event.participants && event.participants.length > 0 && (
              <div className="flex -space-x-1 ml-1">
                {event.participants.slice(0, 2).map((participant, idx) => {
                  const displayName =
                    [participant.firstname, participant.lastname]
                      .filter(Boolean)
                      .join(" ") ||
                    participant.email ||
                    participant.user_id ||
                    "User";
                  const initials = displayName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <Avatar
                      key={participant.user_id || idx}
                      className="h-4 w-4 border border-white"
                    >
                      {participant.avatar_url ? (
                        <AvatarImage
                          src={participant.avatar_url}
                          alt={displayName}
                        />
                      ) : null}
                      <AvatarFallback className="text-[8px] font-medium bg-[#FFF1D3] text-[#5D1C6A]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  );
                })}
                {event.participants.length > 2 && (
                  <div className="h-4 w-4 rounded-full bg-gray-200 border border-white flex items-center justify-center">
                    <span className="text-[6px] font-medium text-gray-600">
                      +{event.participants.length - 2}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}


        {!isShortCard && isBooked && otherQuiet && (
          <span className="inline-flex items-center rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-100 mt-1 w-fit">
            🔇 Quiet
          </span>
        )}
      </div>
    </div>
  );
}
