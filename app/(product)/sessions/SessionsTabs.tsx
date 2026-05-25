"use client";

import { useMemo, useState } from "react";
import { SessionsList } from "./SessionsList";
import { PastSessionsList, type PastSession } from "./PastSessionsList";

type TabKey = "upcoming" | "past";

interface SessionsTabsProps {
  upcoming: PastSession[];
  past: PastSession[];
  currentUserId: string;
}

export function SessionsTabs({ upcoming, past, currentUserId }: SessionsTabsProps) {
  const [tab, setTab] = useState<TabKey>("upcoming");

  // Past stats are useful even when the past tab isn't active (to color the
  // tab counter), so compute once and pass down. We count actually-joined
  // sessions for the "attended" headline so cancellations don't inflate
  // the number.
  const stats = useMemo(() => {
    let booked = 0;
    let attended = 0;
    let completed = 0;
    let minutes = 0;
    let withPartner = 0;
    for (const s of past) {
      const me = s.participants.find((p) => p.userId === currentUserId);
      if (!me) continue;
      booked += 1;
      if (me.attended) attended += 1;
      if (me.completed) {
        completed += 1;
        minutes += s.durationMin || 0;
      }
      if (s.participants.length >= 2) withPartner += 1;
    }
    return { booked, attended, completed, minutes, withPartner };
  }, [past, currentUserId]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
        <TabButton
          active={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
          label="Upcoming"
          count={upcoming.length}
        />
        <TabButton
          active={tab === "past"}
          onClick={() => setTab("past")}
          label="Past"
          count={stats.booked}
        />
      </div>

      {tab === "upcoming" ? (
        <SessionsList sessions={upcoming} currentUserId={currentUserId} />
      ) : (
        <PastSessionsList
          sessions={past}
          currentUserId={currentUserId}
          stats={stats}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-[#5D1C6A] text-white shadow-sm"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      }`}
    >
      <span>{label}</span>
      <span
        className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
          active
            ? "bg-white/20 text-white"
            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
