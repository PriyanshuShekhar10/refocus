"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { CSSProperties } from "react";
import { X } from "lucide-react";

type ActiveUser = { id: string; name: string | null; username: string | null };
type CohortWeek = {
  week: number;
  active: number;
  rate: number;
  partial: boolean;
  activeUsers: ActiveUser[];
};
type CohortRow = {
  cohort: string;
  size: number;
  booked: number;
  joinedCall: number;
  weeks: CohortWeek[];
};
type CohortsResponse = {
  generatedAt: string;
  excluded: { admin: number; demo: number; crew: number; preTracking: number };
  cohorts: CohortRow[];
};

function formatCohortLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function cellStyle(week: CohortWeek | undefined): CSSProperties {
  if (!week) return {};
  const pct = Math.round(week.rate * 100);
  return { backgroundColor: `color-mix(in srgb, var(--rf-primary) ${Math.max(pct, week.active > 0 ? 8 : 0)}%, transparent)` };
}

export default function AdminCohorts() {
  const { data, error, isLoading } = useSWR<CohortsResponse>(
    "/api/admin/cohorts",
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Couldn't load cohort retention.");
      return res.json();
    },
  );
  const [selected, setSelected] = useState<{ cohort: string; week: CohortWeek } | null>(
    null,
  );

  const cohorts = data?.cohorts ?? [];
  const maxWeek = cohorts.reduce(
    (max, c) => Math.max(max, c.weeks.at(-1)?.week ?? 0),
    0,
  );
  const weekCols = Array.from({ length: maxWeek + 1 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-rf-ink">Signup cohort retention</h2>
          <p className="mt-0.5 text-xs text-rf-ink-mute">
            Share of each signup week who joined at least one session call, by week
            since signup. Monday-start weeks, IST.
          </p>
        </div>
        {data ? (
          <p className="text-[11px] text-rf-ink-mute">
            Admins, demo account, engagement crew and pre-Aug 2026 accounts excluded
            ({data.excluded.admin + data.excluded.demo + data.excluded.crew + data.excluded.preTracking} total) ·
            as of {new Date(data.generatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-rf-danger">{(error as Error).message}</p>
      ) : isLoading ? (
        <p className="text-sm text-rf-ink-mute">Loading cohorts…</p>
      ) : cohorts.length === 0 ? (
        <p className="text-sm text-rf-ink-mute">No cohorts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-rf-line bg-rf-card">
          <table className="w-full text-sm">
            <thead className="border-b border-rf-line bg-rf-bg text-left text-[11.5px] font-medium uppercase tracking-[0.02em] text-rf-ink-mute">
              <tr>
                <th className="sticky left-0 bg-rf-bg px-4 py-3">Cohort</th>
                <th className="px-3 py-3 text-right">Size</th>
                <th className="px-3 py-3 text-right">Booked</th>
                <th className="px-3 py-3 text-right">Joined call</th>
                {weekCols.map((w) => (
                  <th key={w} className="px-3 py-3 text-right tabular-nums">
                    W{w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rf-line-soft bg-rf-card">
              {cohorts.map((row) => {
                const byWeek = new Map(row.weeks.map((w) => [w.week, w]));
                return (
                  <tr key={row.cohort}>
                    <td className="sticky left-0 bg-rf-card px-4 py-2.5 font-medium text-rf-ink">
                      {formatCohortLabel(row.cohort)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rf-ink-soft">
                      {row.size}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rf-ink-soft">
                      {row.booked}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rf-ink-soft">
                      {row.joinedCall}
                    </td>
                    {weekCols.map((w) => {
                      const cell = byWeek.get(w);
                      const clickable = Boolean(cell && cell.active > 0);
                      return (
                        <td
                          key={w}
                          className={`px-3 py-2.5 text-right tabular-nums text-rf-ink ${
                            clickable ? "cursor-pointer hover:underline" : ""
                          }`}
                          style={cellStyle(cell)}
                          onClick={() => {
                            if (clickable && cell) setSelected({ cohort: row.cohort, week: cell });
                          }}
                        >
                          {cell ? (
                            <span>
                              {Math.round(cell.rate * 100)}%
                              {cell.partial ? (
                                <span className="text-rf-ink-mute">*</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-rf-ink-mute">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-rf-line-soft px-4 py-2 text-[11px] text-rf-ink-mute">
            * week still in progress · click a cell to see who was active
          </p>
        </div>
      )}

      {selected ? (
        <div className="rounded-xl border border-rf-line bg-rf-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-rf-ink">
                {formatCohortLabel(selected.cohort)} cohort · week {selected.week.week}
              </p>
              <p className="mt-0.5 text-xs text-rf-ink-mute">
                {selected.week.active} active
                {selected.week.partial ? " so far (week still in progress)" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg p-1 text-rf-ink-mute hover:bg-rf-line-soft"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {selected.week.activeUsers.length === 0 ? (
            <p className="mt-3 text-sm text-rf-ink-mute">No one active this week.</p>
          ) : (
            <ul className="mt-3 divide-y divide-rf-line-soft">
              {selected.week.activeUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-medium text-rf-ink">{u.name || "—"}</span>
                  {u.username ? (
                    <Link
                      href={`/u/${u.username}`}
                      target="_blank"
                      className="text-rf-plum-ink hover:underline"
                    >
                      @{u.username}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
