"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { OccupiedPerson } from "@/types/calendar";

export function HourOccupancyChip({
  people,
  total,
  className = "",
}: {
  people: OccupiedPerson[];
  total: number;
  className?: string;
}) {
  if (total <= 0) return null;
  const shown = people.slice(0, 2);
  const extra = Math.max(0, total - shown.length);
  const label =
    total === 1
      ? "1 person in a session this hour"
      : `${total} people in sessions this hour`;

  return (
    <div
      className={`pointer-events-none flex items-center gap-1 rounded-full border border-gray-200/90 bg-white/90 px-1.5 py-0.5 shadow-sm backdrop-blur-sm dark:border-gray-600 dark:bg-gray-900/90 ${className}`}
      title={label}
      aria-label={label}
    >
      <div className="flex -space-x-1.5">
        {shown.map((p) => (
          <Avatar
            key={p.id}
            className="h-5 w-5 border border-white dark:border-gray-800"
          >
            {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-gray-200 text-[8px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-200">
              {p.initials}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      {extra > 0 ? (
        <span className="pr-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
          +{extra}
        </span>
      ) : (
        <span className="pr-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
          attending
        </span>
      )}
    </div>
  );
}
