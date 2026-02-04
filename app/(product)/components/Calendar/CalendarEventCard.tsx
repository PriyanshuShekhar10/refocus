"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { CalendarEvent } from "@/types/calendar";
import { getResolvedSessionColor } from "@/constants/calendar";
import { getLocalSessionColor } from "@/lib/sessionColors";

/** Check if session starts within the next hour or has already started (but not ended) */
function isJoinable(startTime: Date | string, endTime?: Date | string): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000); // default 1hr if no end
  const oneHourBefore = new Date(start.getTime() - 60 * 60 * 1000);
  return now >= oneHourBefore && now <= end;
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
  onBook: (e: React.MouseEvent) => void;
  onDetails: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  /** When provided and user is participant (booked, not owner), shows Leave button */
  onLeave?: () => void;
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
  onBook,
  onDetails,
  onDelete,
  onLeave,
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

  useEffect(() => {
    // Re-check joinability every 30 seconds
    const check = () => setCanJoin(isJoinable(event.start, event.end));
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [event.start, event.end]);

  const timeLabel = s.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });

  if (isCompact) {
    return (
      <div
        className="group absolute left-2 z-20 w-10 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 hover:border-indigo-400 hover:bg-indigo-50/80 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20 cursor-pointer flex flex-col items-center justify-center gap-0.5 transition-colors"
        style={{ top, height }}
        title={`${timeLabel} • ${event.durationMin} min • Click to book`}
        onClick={(evt) => {
          evt.stopPropagation();
          onBook(evt);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 shrink-0 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 tabular-nums">
          {timeLabel}
        </span>
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
              : "border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-100 dark:bg-indigo-900/80 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer"
        } ${
          isJoinableNow
            ? "border-emerald-500 ring-2 ring-emerald-400/80 shadow-md"
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
            className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
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
                  ? "text-gray-800 dark:text-indigo-200"
                  : "text-indigo-700 dark:text-indigo-300"
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
                      <AvatarFallback className="text-[8px] font-medium bg-indigo-100 text-indigo-600">
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
