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
      const matched = s.participants.length >= 2;
      // Solo/unmatched sessions cannot be joined — exclude from booked/attendance.
      if (matched) {
        booked += 1;
        if (me.attended) attended += 1;
        withPartner += 1;
      }
      if (me.completed) {
        completed += 1;
        minutes += s.durationMin || 0;
      }
    }
    return { booked, attended, completed, minutes, withPartner };
  }, [past, currentUserId]);

  return (
    <div>
      <div className="mb-5 flex w-fit items-center gap-1 rounded-full border border-rf-line bg-rf-card p-1">
        <TabButton
          active={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
          label="Upcoming"
          count={upcoming.length}
        />
        <TabButton
          active={tab === "past"}
          onClick={() => setTab("past")}
          label="History"
          count={past.length}
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
      className={`inline-flex h-[34px] items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors ${
        active
          ? "bg-rf-primary text-rf-on-primary"
          : "text-rf-ink-soft hover:bg-rf-line-soft"
      }`}
    >
      <span>{label}</span>
      <span
        className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 font-rf-mono text-[11px] ${
          active ? "bg-white/20 dark:bg-black/15" : "bg-rf-line-soft"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
