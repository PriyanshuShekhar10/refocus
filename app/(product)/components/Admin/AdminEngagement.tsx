"use client";

import { useState } from "react";
import useSWR from "swr";

type Range = "today" | "7d" | "30d" | "all";

type Metrics = {
  activeUsers: number;
  matchRate: number | null;
  noShowRate: number | null;
  medianMatchMs: number | null;
  firstDone: number;
  newUsers: number;
  returnRate: number | null;
};

type EngagementResponse = { range: Range; current: Metrics; previous: Metrics | null };

const RANGES: [Range, string][] = [
  ["today", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["all", "All time"],
];

const RANGE_PHRASE: Record<Range, string> = {
  today: "today",
  "7d": "in 7 days",
  "30d": "in 30 days",
  all: "ever",
};

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

function duration(msValue: number | null): string {
  if (msValue === null) return "—";
  const mins = Math.round(msValue / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${String(mins % 60).padStart(2, "0")}m`;
}

/** Signed change; `good` says whether a rise is good (drives the color). */
function delta(
  cur: number | null,
  prev: number | null,
  kind: "pct" | "pts" | "mins",
  riseIsGood: boolean,
): { text: string; good: boolean } | null {
  if (cur === null || prev === null) return null;
  let diff: number;
  let text: string;
  if (kind === "pct") {
    if (prev === 0) return null;
    diff = Math.round(((cur - prev) / prev) * 100);
    text = `${Math.abs(diff)}%`;
  } else if (kind === "pts") {
    diff = Math.round((cur - prev) * 100);
    text = `${Math.abs(diff)} pt${Math.abs(diff) === 1 ? "" : "s"}`;
  } else {
    diff = Math.round((cur - prev) / 60000);
    text = `${Math.abs(diff)}m`;
  }
  if (diff === 0) return null;
  return { text: `${diff > 0 ? "+" : "−"}${text}`, good: diff > 0 === riseIsGood };
}

export default function AdminEngagement() {
  const [range, setRange] = useState<Range>("7d");
  const { data, error, isLoading } = useSWR<EngagementResponse>(
    `/api/admin/engagement?range=${range}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Couldn't load engagement metrics.");
      return res.json();
    },
    { keepPreviousData: true },
  );

  const c = data?.current;
  const p = data?.previous ?? null;
  const cards = c
    ? [
        {
          label: "Active users",
          value: c.activeUsers.toLocaleString(),
          d: delta(c.activeUsers, p?.activeUsers ?? null, "pct", true),
          hint: `Booked or joined a session ${RANGE_PHRASE[range]}`,
        },
        {
          label: "Match rate",
          value: pct(c.matchRate),
          d: delta(c.matchRate, p?.matchRate ?? null, "pts", true),
          hint: "Posted sessions that found a partner",
        },
        {
          label: "No-show rate",
          value: pct(c.noShowRate),
          d: delta(c.noShowRate, p?.noShowRate ?? null, "pts", false),
          hint: "Matched sessions where someone didn’t join",
        },
        {
          label: "Median time to match",
          value: duration(c.medianMatchMs),
          d: delta(c.medianMatchMs, p?.medianMatchMs ?? null, "mins", false),
          hint: "From posting to a partner joining",
        },
        {
          label: "First session completed",
          value:
            range === "today"
              ? `${c.firstDone} of ${c.newUsers}`
              : pct(c.newUsers ? c.firstDone / c.newUsers : null),
          d: null,
          hint:
            range === "today"
              ? "New members today who finished a first session"
              : `${c.firstDone} of ${c.newUsers.toLocaleString()} ${range === "all" ? "members" : "new members"} finished a first session`,
        },
        {
          label: "7-day return",
          value: pct(c.returnRate),
          d: delta(c.returnRate, p?.returnRate ?? null, "pts", true),
          hint: "Members who came back within 7 days of a session",
        },
      ]
    : [];

  return (
    <>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3 border-t border-rf-line pt-5">
        <h2 className="text-sm font-semibold text-rf-ink">Engagement</h2>
        <div className="flex flex-wrap gap-2">
          {RANGES.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              aria-pressed={range === id}
              className={`h-8 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors ${
                range === id
                  ? "border-rf-primary bg-rf-primary text-rf-on-primary"
                  : "border-rf-line bg-rf-card text-rf-ink-soft hover:bg-rf-line-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rf-danger">{(error as Error).message}</p>
      ) : isLoading && !data ? (
        <p className="text-sm text-rf-ink-mute">Loading engagement…</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-rf-line bg-rf-card p-4">
              <p className="text-[11.5px] font-medium uppercase tracking-[0.03em] text-rf-ink-mute">
                {card.label}
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums text-rf-ink">
                  {card.value}
                </span>
                {card.d ? (
                  <span
                    className={`text-xs font-medium ${
                      card.d.good ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {card.d.text}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-rf-ink-mute">{card.hint}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
