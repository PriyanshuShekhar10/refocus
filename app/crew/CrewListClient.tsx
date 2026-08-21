"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CREW_METRICS,
  CREW_RANGE_OPTIONS,
  crewMemberPath,
  type CrewStatsPayload,
} from "./crewShared";

export default function CrewListClient() {
  const [days, setDays] = useState<number>(14);
  const [data, setData] = useState<CrewStatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const members = data?.members ?? [];
  const headerHint = useMemo(() => {
    if (!data) return null;
    return `Today (${data.todayKey}, ${data.timezone}) · click a person for details`;
  }, [data]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Crew</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {headerHint ?? "Day-wise session activity"}
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
              {members.map((m) => (
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
                      >
                        {m.today[metricCol.key]}
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
  );
}
