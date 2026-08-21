"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CREW_METRICS,
  CREW_RANGE_OPTIONS,
  crewMemberPath,
  formatCrewDateRange,
  sumCrewDays,
  type CrewStatsPayload,
} from "./crewShared";

export default function CrewListClient() {
  const [days, setDays] = useState<number>(14);
  const [data, setData] = useState<CrewStatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeFrom, setRangeFrom] = useState<string | null>(null);
  const [rangeTo, setRangeTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crew/stats?days=${days}`);
      const json = (await res.json()) as CrewStatsPayload & { error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  // When the loaded window changes, reset the custom range to the full window.
  useEffect(() => {
    if (!data?.fromKey || !data?.toKey) return;
    setRangeFrom(data.fromKey);
    setRangeTo(data.toKey);
  }, [data?.fromKey, data?.toKey]);

  const members = data?.members ?? [];

  const effectiveFrom = useMemo(() => {
    if (!rangeFrom || !rangeTo) return rangeFrom;
    return rangeFrom <= rangeTo ? rangeFrom : rangeTo;
  }, [rangeFrom, rangeTo]);

  const effectiveTo = useMemo(() => {
    if (!rangeFrom || !rangeTo) return rangeTo;
    return rangeFrom <= rangeTo ? rangeTo : rangeFrom;
  }, [rangeFrom, rangeTo]);

  const dateRangeLabel = useMemo(() => {
    if (!effectiveFrom || !effectiveTo) return null;
    return formatCrewDateRange(effectiveFrom, effectiveTo);
  }, [effectiveFrom, effectiveTo]);

  const isFullWindow =
    !!data &&
    rangeFrom === data.fromKey &&
    rangeTo === data.toKey;

  const setFullWindow = () => {
    if (!data) return;
    setRangeFrom(data.fromKey);
    setRangeTo(data.toKey);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Crew</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {dateRangeLabel
                ? `${dateRangeLabel} · ${data?.timezone ?? "Asia/Kolkata"}`
                : "Session activity by person"}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              Totals for the selected range · click a person for day-by-day
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1">
            {CREW_RANGE_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDays(n)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  days === n
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {n}d
              </button>
            ))}
          </div>
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Range
          </span>
          <label className="flex items-center gap-1.5 text-sm text-neutral-600">
            <span className="text-xs text-neutral-400">From</span>
            <input
              type="date"
              value={rangeFrom ?? data?.fromKey ?? ""}
              min={data?.fromKey}
              max={rangeTo ?? data?.toKey}
              disabled={!data}
              onChange={(e) => {
                const next = e.target.value;
                if (!next) return;
                setRangeFrom(next);
              }}
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm disabled:opacity-50"
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-neutral-600">
            <span className="text-xs text-neutral-400">To</span>
            <input
              type="date"
              value={rangeTo ?? data?.toKey ?? ""}
              min={rangeFrom ?? data?.fromKey}
              max={data?.toKey}
              disabled={!data}
              onChange={(e) => {
                const next = e.target.value;
                if (!next) return;
                setRangeTo(next);
              }}
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm disabled:opacity-50"
            />
          </label>
          {!isFullWindow && data ? (
            <button
              type="button"
              onClick={setFullWindow}
              className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
            >
              Full window
            </button>
          ) : null}
        </div>

        {loading && !data ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Person</th>
                {CREW_METRICS.map((m) => (
                  <th key={m.key} className="px-3 py-3 text-right font-medium">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-neutral-500"
                  >
                    No crew members yet
                  </td>
                </tr>
              ) : null}
              {members.map((m) => {
                const sliced =
                  effectiveFrom && effectiveTo
                    ? m.days.filter(
                        (d) =>
                          d.date >= effectiveFrom && d.date <= effectiveTo,
                      )
                    : m.days;
                const rangeTotals = sumCrewDays(sliced);
                return (
                  <tr key={m.email} className="border-t border-neutral-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`${crewMemberPath(m.email)}?days=${days}`}
                        className="block hover:underline"
                      >
                        <div className="font-medium text-neutral-900">
                          {m.name || "Unnamed"}
                        </div>
                        {!m.userId ? (
                          <div className="text-xs text-amber-700">
                            Not registered
                          </div>
                        ) : null}
                      </Link>
                    </td>
                    {CREW_METRICS.map((metricCol) => (
                      <td
                        key={metricCol.key}
                        className="px-3 py-3 text-right tabular-nums text-neutral-800"
                      >
                        <Link
                          href={`${crewMemberPath(m.email)}?days=${days}`}
                          className="block"
                          title={`Today: ${m.today[metricCol.key]}`}
                        >
                          {rangeTotals[metricCol.key]}
                        </Link>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
