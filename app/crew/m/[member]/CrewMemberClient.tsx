"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CrewSparkline } from "../../CrewSparkline";
import {
  CREW_DAYS_PAGE_SIZE,
  CREW_METRICS,
  CREW_RANGE_OPTIONS,
  filterCrewDays,
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
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-800">Sessions</h2>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <span className="text-xs uppercase tracking-wide text-neutral-400">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as CrewSessionRow["status"] | "all",
              )
            }
            className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm"
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
            <table className="w-full text-sm">
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
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Day</th>
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
                <td className="px-4 py-2.5 tabular-nums text-neutral-700">
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
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricKey>("created");
  const [filterMode, setFilterMode] = useState<DayFilterMode>("activity");

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
        setMeta({ timezone: json.timezone, todayKey: json.todayKey });
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
    // Chart: only days that matter for the selected view (no flat zero stretch)
    if (filterMode === "all") return member.days;
    return filterCrewDays(member.days, filterMode, metric);
  }, [member, filterMode, metric]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6">
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
            <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {member.name || member.email}
                </h1>
                {member.name ? (
                  <p className="mt-1 text-sm text-neutral-500">{member.email}</p>
                ) : null}
                {meta ? (
                  <p className="mt-1 text-xs text-neutral-400">
                    Today {meta.todayKey} · {meta.timezone}
                  </p>
                ) : null}
                {!member.userId ? (
                  <p className="mt-1 text-xs text-amber-700">Not registered</p>
                ) : null}
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

            <section className="mb-8 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Today
              </p>
              <div className="grid grid-cols-5 gap-2 text-center">
                {CREW_METRICS.map((m) => (
                  <div key={m.key}>
                    <div className="text-lg font-semibold tabular-nums">
                      {member.today[m.key]}
                    </div>
                    <div className="text-[11px] text-neutral-500">{m.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-8">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {CREW_METRICS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setMetric(opt.key)}
                    className={`rounded-md px-2.5 py-1 text-xs ${
                      metric === opt.key
                        ? "bg-neutral-900 text-white"
                        : "border border-neutral-200 bg-white text-neutral-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2">
                {sparklineDays.length > 0 ? (
                  <CrewSparkline days={sparklineDays} metric={metric} />
                ) : (
                  <p className="py-8 text-center text-sm text-neutral-500">
                    No points to chart yet
                  </p>
                )}
              </div>
            </section>

            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-neutral-800">By day</h2>
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <span className="text-xs uppercase tracking-wide text-neutral-400">
                    Filter
                  </span>
                  <select
                    value={filterMode}
                    onChange={(e) =>
                      setFilterMode(e.target.value as DayFilterMode)
                    }
                    className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm"
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
