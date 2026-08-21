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
    !!data && rangeFrom === data.fromKey && rangeTo === data.toKey;

  const setFullWindow = () => {
    if (!data) return;
    setRangeFrom(data.fromKey);
    setRangeTo(data.toKey);
  };

  const memberRows = members.map((m) => {
    const sliced =
      effectiveFrom && effectiveTo
        ? m.days.filter(
            (d) => d.date >= effectiveFrom && d.date <= effectiveTo,
          )
        : m.days;
    return { member: m, totals: sumCrewDays(sliced) };
  });

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Crew</h1>
            <p className="mt-1 text-sm text-neutral-500 break-words">
              {dateRangeLabel
                ? `${dateRangeLabel} · ${data?.timezone ?? "Asia/Kolkata"}`
                : "Session activity by person"}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              Totals for the selected range · tap a person for details
            </p>
          </div>
          <div className="flex w-full shrink-0 gap-1 rounded-lg border border-neutral-200 bg-white p-1 sm:w-auto">
            {CREW_RANGE_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDays(n)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm sm:flex-none ${
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

        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:py-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Range
          </span>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <label className="flex min-w-0 items-center gap-1.5 text-sm text-neutral-600">
              <span className="w-10 shrink-0 text-xs text-neutral-400 sm:w-auto">
                From
              </span>
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
                className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm disabled:opacity-50 sm:flex-none"
              />
            </label>
            <label className="flex min-w-0 items-center gap-1.5 text-sm text-neutral-600">
              <span className="w-10 shrink-0 text-xs text-neutral-400 sm:w-auto">
                To
              </span>
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
                className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm disabled:opacity-50 sm:flex-none"
              />
            </label>
          </div>
          {!isFullWindow && data ? (
            <button
              type="button"
              onClick={setFullWindow}
              className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 sm:ml-auto"
            >
              Full window
            </button>
          ) : null}
        </div>

        {loading && !data ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {/* Mobile: stacked cards */}
        <div className="space-y-3 md:hidden">
          {memberRows.length === 0 && !loading ? (
            <div className="rounded-xl border border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
              No crew members yet
            </div>
          ) : null}
          {memberRows.map(({ member: m, totals }) => (
            <Link
              key={m.email}
              href={`${crewMemberPath(m.email)}?days=${days}`}
              className="block rounded-xl border border-neutral-200 bg-white p-4 active:bg-neutral-50"
            >
              <div className="font-medium text-neutral-900">
                {m.name || "Unnamed"}
              </div>
              {!m.userId ? (
                <div className="mt-0.5 text-xs text-amber-700">
                  Not registered
                </div>
              ) : null}
              <dl className="mt-3 grid grid-cols-3 gap-x-2 gap-y-2 sm:grid-cols-5">
                {CREW_METRICS.map((metricCol) => (
                  <div key={metricCol.key} className="min-w-0 text-center">
                    <dt className="truncate text-[10px] uppercase tracking-wide text-neutral-400">
                      {metricCol.label}
                    </dt>
                    <dd className="text-base font-semibold tabular-nums text-neutral-900">
                      {totals[metricCol.key]}
                    </dd>
                  </div>
                ))}
              </dl>
            </Link>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Person</th>
                  {CREW_METRICS.map((m) => (
                    <th
                      key={m.key}
                      className="px-3 py-3 text-right font-medium"
                    >
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memberRows.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-neutral-500"
                    >
                      No crew members yet
                    </td>
                  </tr>
                ) : null}
                {memberRows.map(({ member: m, totals }) => (
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
                          {totals[metricCol.key]}
                        </Link>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
