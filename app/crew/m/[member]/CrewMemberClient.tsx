"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CrewSparkline } from "../../CrewSparkline";
import {
  CREW_DAYS_PAGE_SIZE,
  CREW_METRICS,
  CREW_METRIC_COLORS,
  CREW_RANGE_OPTIONS,
  filterCrewDays,
  formatCrewDateRange,
  sumCrewDays,
  type CrewMemberStats,
  type CrewStatsPayload,
  type DayCounts,
  type MetricKey,
} from "../../crewShared";

type DayFilterMode = "activity" | "metric" | "all";

type CrewSessionRow = {
  id: string;
  startTime: string | null;
  endTime: string | null;
  durationMin: number | null;
  sessionType: string;
  bookingStatus: string;
  role: "created" | "joined";
  partner: string | null;
  matched: boolean;
  status:
    | "upcoming"
    | "in-progress"
    | "open"
    | "finished"
    | "attended"
    | "missed"
    | "unmatched";
};

const SESSION_STATUS_LABEL: Record<CrewSessionRow["status"], string> = {
  upcoming: "Upcoming",
  "in-progress": "In progress",
  open: "Open slot",
  finished: "Finished",
  attended: "Attended (left early)",
  missed: "Missed",
  unmatched: "Unmatched",
};

const SESSION_STATUS_FILTERS: Array<CrewSessionRow["status"] | "all"> = [
  "all",
  "finished",
  "attended",
  "missed",
  "unmatched",
  "upcoming",
  "in-progress",
  "open",
];

function formatSessionWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CrewSessionsSection({ email }: { email: string }) {
  const [sessions, setSessions] = useState<CrewSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    CrewSessionRow["status"] | "all"
  >("all");
  const [page, setPage] = useState(0);
  const pageSize = 8;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/crew/sessions?email=${encodeURIComponent(email)}&limit=60`)
      .then(async (res) => {
        const json = (await res.json()) as {
          sessions?: CrewSessionRow[];
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "Failed to load sessions");
        if (!cancelled) setSessions(json.sessions ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return sessions;
    return sessions.filter((s) => s.status === statusFilter);
  }, [sessions, statusFilter]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, sessions.length]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const slice = filtered.slice(start, start + pageSize);

  return (
    <section className="mt-8 sm:mt-10">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <h2 className="text-sm font-medium text-neutral-800">Sessions</h2>
        <label className="flex min-w-0 items-center gap-2 text-sm text-neutral-600">
          <span className="shrink-0 text-xs uppercase tracking-wide text-neutral-400">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as CrewSessionRow["status"] | "all",
              )
            }
            className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm sm:flex-none"
          >
            {SESSION_STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All" : SESSION_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading sessions…</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full min-w-[28rem] text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Partner</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2.5 text-neutral-800">
                      <div>{formatSessionWhen(s.startTime)}</div>
                      <div className="text-xs text-neutral-400">
                        {s.durationMin ? `${s.durationMin} min` : null}
                        {s.sessionType ? ` · ${s.sessionType}` : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 capitalize text-neutral-700">
                      {s.role}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-700">
                      {s.partner ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-900">
                      {SESSION_STATUS_LABEL[s.status]}
                    </td>
                  </tr>
                ))}
                {slice.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-neutral-500"
                    >
                      No sessions yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {pageCount > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-neutral-600">
              <p>
                {start + 1}–{Math.min(start + pageSize, filtered.length)} of{" "}
                {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  Newer
                </button>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() =>
                    setPage((p) => Math.min(pageCount - 1, p + 1))
                  }
                  className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  Older
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function DayTable({
  daysNewestFirst,
  metric,
  filterMode,
}: {
  daysNewestFirst: DayCounts[];
  metric: MetricKey;
  filterMode: DayFilterMode;
}) {
  const [page, setPage] = useState(0);
  const showAllMetrics = filterMode === "activity" || filterMode === "all";
  const pageCount = Math.max(
    1,
    Math.ceil(daysNewestFirst.length / CREW_DAYS_PAGE_SIZE),
  );
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * CREW_DAYS_PAGE_SIZE;
  const slice = daysNewestFirst.slice(start, start + CREW_DAYS_PAGE_SIZE);
  const metricLabel =
    CREW_METRICS.find((m) => m.key === metric)?.label ?? metric;
  const colSpan = showAllMetrics ? 6 : 2;

  useEffect(() => {
    setPage(0);
  }, [daysNewestFirst.length, metric, filterMode]);

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="sticky left-0 z-10 bg-neutral-50 px-4 py-3 font-medium">
                Day
              </th>
              {showAllMetrics ? (
                CREW_METRICS.map((m) => (
                  <th key={m.key} className="px-3 py-3 text-right font-medium">
                    {m.label}
                  </th>
                ))
              ) : (
                <th className="px-4 py-3 text-right font-medium">
                  {metricLabel}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {slice.map((d) => (
              <tr key={d.date} className="border-t border-neutral-100">
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 tabular-nums text-neutral-700">
                  {d.date}
                </td>
                {showAllMetrics ? (
                  CREW_METRICS.map((m) => (
                    <td
                      key={m.key}
                      className="px-3 py-2.5 text-right tabular-nums text-neutral-900"
                    >
                      {d[m.key] || "—"}
                    </td>
                  ))
                ) : (
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-neutral-900">
                    {d[metric]}
                  </td>
                )}
              </tr>
            ))}
            {slice.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  No matching days yet — activity shows up here as it happens
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-neutral-600">
          <p>
            {start + 1}–
            {Math.min(start + CREW_DAYS_PAGE_SIZE, daysNewestFirst.length)} of{" "}
            {daysNewestFirst.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 disabled:opacity-40"
            >
              Newer
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 disabled:opacity-40"
            >
              Older
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CrewMemberClient({
  email,
  initialDays,
}: {
  email: string;
  initialDays: number;
}) {
  const [days, setDays] = useState(initialDays);
  const [member, setMember] = useState<CrewMemberStats | null>(null);
  const [meta, setMeta] = useState<{
    timezone: string;
    todayKey: string;
    fromKey: string;
    toKey: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricKey>("created");
  const [filterMode, setFilterMode] = useState<DayFilterMode>("activity");
  const [summaryFrom, setSummaryFrom] = useState<string | null>(null);
  const [summaryTo, setSummaryTo] = useState<string | null>(null);
  const [chartMetrics, setChartMetrics] = useState<MetricKey[]>(
    () => CREW_METRICS.map((m) => m.key),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crew/stats?days=${days}`);
      const json = (await res.json()) as CrewStatsPayload & { error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load");
      const found =
        json.members.find(
          (m) => m.email.toLowerCase() === email.toLowerCase(),
        ) ?? null;
      if (!found) {
        setMember(null);
        setError("Person not on the crew roster");
      } else {
        setMember(found);
        setMeta({
          timezone: json.timezone,
          todayKey: json.todayKey,
          fromKey: json.fromKey,
          toKey: json.toKey,
        });
      }
    } catch (e) {
      setError((e as Error).message);
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [days, email]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep summary range within the loaded window; default to the full window.
  useEffect(() => {
    if (!meta) return;
    setSummaryFrom((prev) => {
      if (prev && prev >= meta.fromKey && prev <= meta.toKey) return prev;
      return meta.fromKey;
    });
    setSummaryTo((prev) => {
      if (prev && prev >= meta.fromKey && prev <= meta.toKey) return prev;
      return meta.toKey;
    });
  }, [meta]);

  const filteredDays = useMemo(() => {
    if (!member) return [];
    return filterCrewDays(member.days, filterMode, metric);
  }, [member, filterMode, metric]);

  const daysNewestFirst = useMemo(
    () => [...filteredDays].reverse(),
    [filteredDays],
  );

  const sparklineDays = useMemo(() => {
    if (!member) return [];
    // Always chart the full selected window so all series share the same x-axis.
    return member.days;
  }, [member]);

  const summaryTotals = useMemo(() => {
    if (!member || !summaryFrom || !summaryTo) {
      return { created: 0, deleted: 0, joined: 0, attended: 0, finished: 0 };
    }
    const from = summaryFrom <= summaryTo ? summaryFrom : summaryTo;
    const to = summaryFrom <= summaryTo ? summaryTo : summaryFrom;
    return sumCrewDays(
      member.days.filter((d) => d.date >= from && d.date <= to),
    );
  }, [member, summaryFrom, summaryTo]);

  const summaryRangeLabel = useMemo(() => {
    if (!summaryFrom || !summaryTo) return null;
    const from = summaryFrom <= summaryTo ? summaryFrom : summaryTo;
    const to = summaryFrom <= summaryTo ? summaryTo : summaryFrom;
    return formatCrewDateRange(from, to);
  }, [summaryFrom, summaryTo]);

  const setSummaryRange = (from: string, to: string) => {
    if (from <= to) {
      setSummaryFrom(from);
      setSummaryTo(to);
    } else {
      setSummaryFrom(to);
      setSummaryTo(from);
    }
  };

  const onChartSelectDate = (date: string) => {
    // Click a day → focus that single day; use the From/To inputs for a wider range.
    setSummaryRange(date, date);
  };

  const toggleChartMetric = (key: MetricKey) => {
    setChartMetrics((prev) => {
      if (prev.includes(key)) {
        // Keep at least one series visible.
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
    setMetric(key);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="mb-5 sm:mb-6">
          <Link
            href="/crew"
            className="text-sm text-neutral-500 hover:text-neutral-800"
          >
            ← All crew
          </Link>
        </div>

        {loading && !member ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : null}
        {error && !member ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}

        {member ? (
          <>
            <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {member.name || member.email}
                </h1>
                {member.name ? (
                  <p className="mt-1 break-all text-sm text-neutral-500">
                    {member.email}
                  </p>
                ) : null}
                {meta ? (
                  <p className="mt-1 text-xs text-neutral-400 break-words">
                    {formatCrewDateRange(meta.fromKey, meta.toKey)} ·{" "}
                    {meta.timezone}
                  </p>
                ) : null}
                {!member.userId ? (
                  <p className="mt-1 text-xs text-amber-700">Not registered</p>
                ) : null}
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

            <section className="mb-6 overflow-hidden rounded-xl border border-neutral-200 bg-white p-3 sm:mb-8 sm:p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Range totals
                </p>
                <div className="flex flex-col gap-2 text-sm text-neutral-600 sm:flex-row sm:flex-wrap sm:items-center">
                  <label className="flex min-w-0 items-center gap-1.5">
                    <span className="w-10 shrink-0 text-xs uppercase tracking-wide text-neutral-400 sm:w-auto">
                      From
                    </span>
                    <input
                      type="date"
                      value={summaryFrom ?? meta?.fromKey ?? ""}
                      min={meta?.fromKey}
                      max={summaryTo ?? meta?.toKey}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!next) return;
                        setSummaryFrom(next);
                      }}
                      className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm sm:flex-none"
                    />
                  </label>
                  <label className="flex min-w-0 items-center gap-1.5">
                    <span className="w-10 shrink-0 text-xs uppercase tracking-wide text-neutral-400 sm:w-auto">
                      To
                    </span>
                    <input
                      type="date"
                      value={summaryTo ?? meta?.toKey ?? ""}
                      min={summaryFrom ?? meta?.fromKey}
                      max={meta?.toKey}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!next) return;
                        setSummaryTo(next);
                      }}
                      className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm sm:flex-none"
                    />
                  </label>
                  {meta &&
                  (summaryFrom !== meta.fromKey ||
                    summaryTo !== meta.toKey) ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSummaryRange(meta.fromKey, meta.toKey)
                      }
                      className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
                    >
                      Full window
                    </button>
                  ) : null}
                </div>
              </div>
              {summaryRangeLabel ? (
                <p className="mb-3 text-xs text-neutral-400">
                  {summaryRangeLabel}
                </p>
              ) : null}
              <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
                {CREW_METRICS.map((m) => (
                  <div key={m.key} className="min-w-0">
                    <div
                      className="text-base font-semibold tabular-nums sm:text-lg"
                      style={{ color: CREW_METRIC_COLORS[m.key] }}
                    >
                      {summaryTotals[m.key]}
                    </div>
                    <div className="truncate text-[10px] text-neutral-500 sm:text-[11px]">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-6 sm:mb-8">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {CREW_METRICS.map((opt) => {
                  const active = chartMetrics.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleChartMetric(opt.key)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs border ${
                        active
                          ? "border-transparent text-white"
                          : "border-neutral-200 bg-white text-neutral-500"
                      }`}
                      style={
                        active
                          ? { backgroundColor: CREW_METRIC_COLORS[opt.key] }
                          : undefined
                      }
                      title={
                        active
                          ? `Hide ${opt.label} on chart`
                          : `Show ${opt.label} on chart`
                      }
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: active
                            ? "#fff"
                            : CREW_METRIC_COLORS[opt.key],
                        }}
                      />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white px-2 py-2 sm:px-3">
                {sparklineDays.length > 0 ? (
                  <div className="min-w-[18rem]">
                    <CrewSparkline
                      days={sparklineDays}
                      visibleMetrics={chartMetrics}
                      selectedFrom={summaryFrom}
                      selectedTo={summaryTo}
                      onSelectDate={onChartSelectDate}
                    />
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-neutral-500">
                    No points to chart yet
                  </p>
                )}
              </div>
              <p className="mt-2 text-[11px] text-neutral-400">
                Tap a day on the chart to focus that date
              </p>
            </section>

            <section>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                <h2 className="text-sm font-medium text-neutral-800">By day</h2>
                <label className="flex min-w-0 items-center gap-2 text-sm text-neutral-600">
                  <span className="shrink-0 text-xs uppercase tracking-wide text-neutral-400">
                    Filter
                  </span>
                  <select
                    value={filterMode}
                    onChange={(e) =>
                      setFilterMode(e.target.value as DayFilterMode)
                    }
                    className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm sm:flex-none"
                  >
                    <option value="activity">Days with any activity</option>
                    <option value="metric">
                      Days with{" "}
                      {CREW_METRICS.find((m) => m.key === metric)?.label ??
                        metric}
                    </option>
                    <option value="all">All days in range</option>
                  </select>
                </label>
              </div>
              <DayTable
                daysNewestFirst={daysNewestFirst}
                metric={metric}
                filterMode={filterMode}
              />
            </section>

            <CrewSessionsSection email={member.email} />
          </>
        ) : null}
      </div>
    </div>
  );
}
