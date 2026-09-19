"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  countCompliantDays,
  CREW_ACTIVITY_FORMULA,
  CREW_METRICS,
  crewMemberPath,
  crewRangeQuery,
  sumCrewDays,
  type CrewRangeMode,
  type CrewStatsPayload,
} from "./crewShared";

export default function CrewListClient() {
  const [rangeMode, setRangeMode] = useState<CrewRangeMode>(30);
  const [data, setData] = useState<CrewStatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const statsRes = await fetch(
        `/api/crew/stats?days=${crewRangeQuery(rangeMode)}`,
      );
      const json = (await statsRes.json()) as CrewStatsPayload & {
        error?: string;
      };
      if (!statsRes.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
      setInitialLoad(false);
    }
  }, [rangeMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const members = data?.members ?? [];
  const memberHrefDays = crewRangeQuery(rangeMode);

  const dateRangeLabel = useMemo(() => {
    if (rangeMode === "all") return "All time";
    return "Last 30 days";
  }, [rangeMode]);

  const memberRows = members.map((m) => ({
    member: m,
    totals: sumCrewDays(m.days),
    compliantDays: countCompliantDays(m.days),
  }));

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Crew</h1>
            <p className="mt-1 text-sm text-neutral-500 break-words">
              {dateRangeLabel} · {data?.timezone ?? "Asia/Kolkata"}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              Totals for the selected window · tap a person for details
              {refreshing ? " · Updating…" : ""}
            </p>
          </div>
          <div className="flex w-full shrink-0 gap-1 rounded-lg border border-neutral-200 bg-white p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => setRangeMode(30)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm sm:flex-none ${
                rangeMode === 30
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              30d
            </button>
            <button
              type="button"
              onClick={() => setRangeMode("all")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm sm:flex-none ${
                rangeMode === "all"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              All time
            </button>
          </div>
        </header>

        {initialLoad && !data ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {initialLoad && !data ? (
          <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white md:block">
            <div className="animate-pulse space-y-0 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="mb-3 h-8 rounded bg-neutral-100" />
              ))}
            </div>
          </div>
        ) : null}

        {/* Mobile: stacked cards */}
        <div className={`space-y-3 md:hidden ${refreshing ? "opacity-70" : ""}`}>
          {memberRows.length === 0 && !initialLoad ? (
            <div className="rounded-xl border border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
              No crew members yet
            </div>
          ) : null}
          {memberRows.map(({ member: m, totals, compliantDays }) => (
            <Link
              key={m.email}
              href={`${crewMemberPath(m.email)}?days=${memberHrefDays}`}
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
              <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3">
                <div className="text-center">
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-400">
                    Compliant days
                  </dt>
                  <dd className="text-base font-semibold tabular-nums text-neutral-900">
                    {compliantDays}
                  </dd>
                </div>
                <div className="text-center">
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-400">
                    Inactive days
                  </dt>
                  <dd className="text-base font-semibold tabular-nums text-neutral-900">
                    {m.inactiveDays}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>

        {/* Desktop: table */}
        {!initialLoad || data ? (
        <div
          className={`hidden overflow-hidden rounded-xl border border-neutral-200 bg-white md:block ${refreshing ? "opacity-70" : ""}`}
        >
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
                  <th className="px-3 py-3 text-right font-medium">
                    Compliant days
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    Inactive days
                  </th>
                </tr>
              </thead>
              <tbody>
                {memberRows.length === 0 && !initialLoad ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-neutral-500"
                    >
                      No crew members yet
                    </td>
                  </tr>
                ) : null}
                {memberRows.map(({ member: m, totals, compliantDays }) => (
                  <tr key={m.email} className="border-t border-neutral-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`${crewMemberPath(m.email)}?days=${memberHrefDays}`}
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
                          href={`${crewMemberPath(m.email)}?days=${memberHrefDays}`}
                          className="block"
                          title={`Today: ${m.today[metricCol.key]}`}
                        >
                          {totals[metricCol.key]}
                        </Link>
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right tabular-nums text-neutral-800">
                      {compliantDays}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-neutral-800">
                      {m.inactiveDays}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        ) : null}

        <section className="mt-6 rounded-xl border border-neutral-200 bg-white px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold text-neutral-900">
            {CREW_ACTIVITY_FORMULA.title}
          </h2>
          <div className="mt-3 space-y-3 text-sm text-neutral-600">
            {CREW_ACTIVITY_FORMULA.sections.map((section) => (
              <div key={section.heading}>
                <h3 className="font-medium text-neutral-800">
                  {section.heading}
                </h3>
                <p className="mt-0.5">{section.body}</p>
                {"counts" in section && section.counts ? (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                    {section.counts.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {"excludes" in section && section.excludes ? (
                  <p className="mt-1.5 text-neutral-500">
                    Does not count: {section.excludes.join("; ")}.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
