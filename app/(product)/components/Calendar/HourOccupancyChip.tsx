"use client";

import { useSyncExternalStore } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { OccupiedPerson } from "@/types/calendar";

const emptySubscribe = () => () => {};

export function HourOccupancyChip({
  people,
  total,
  tense = "attending",
  className = "",
}: {
  people: OccupiedPerson[];
  total: number;
  /** Past hours use "attended"; current/future use "attending". */
  tense?: "attending" | "attended";
  className?: string;
}) {
  // Avoid hydration mismatch: server has no reliable "now" vs hour boundary.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (total <= 0) return null;
  const shown = people.slice(0, 2);
  const extra = Math.max(0, total - shown.length);
  const displayTense = hydrated ? tense : "attending";
  const verb = displayTense === "attended" ? "attended" : "attending";
  const label =
    total === 1
      ? displayTense === "attended"
        ? "1 person attended this hour"
        : "1 person in a session this hour"
      : displayTense === "attended"
        ? `${total} people attended this hour`
        : `${total} people in sessions this hour`;

  return (
    <div
      className={`pointer-events-none flex items-center gap-1 rounded-full border border-rf-line/90 bg-rf-card/90 px-1.5 py-0.5 shadow-sm backdrop-blur-sm ${className}`}
      title={label}
      aria-label={label}
    >
      <div className="flex -space-x-1.5">
        {shown.map((p) => (
          <Avatar
            key={p.id}
            className="h-5 w-5 border border-rf-card"
          >
            {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-rf-line text-[8px] font-medium text-rf-ink-soft">
              {p.initials}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      {extra > 0 ? (
        <span className="pr-0.5 text-[10px] font-semibold text-rf-ink-soft">
          +{extra}
        </span>
      ) : (
        <span className="pr-0.5 text-[10px] font-medium text-rf-ink-mute">
          {verb}
        </span>
      )}
    </div>
  );
}
