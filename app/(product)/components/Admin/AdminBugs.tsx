"use client";

import { useState } from "react";
import useSWR from "swr";
import { CircleCheck, Mail, RotateCcw } from "lucide-react";

type BugReport = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  description: string;
  pageUrl: string | null;
  userAgent: string | null;
  viewport: string | null;
  timezone: string | null;
  status: "open" | "resolved";
  emailed: boolean;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
};
type Response = { counts: { open: number; resolved: number }; reports: BugReport[] };
type Filter = "open" | "resolved" | "all";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't load bug reports.");
  return data as Response;
};

/** Short, readable browser label from a user-agent string. */
function browserLabel(ua: string | null): string {
  if (!ua) return "—";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return os ? `${browser} · ${os}` : browser;
}

export default function AdminBugs() {
  const [filter, setFilter] = useState<Filter>("open");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, mutate } = useSWR<Response>(
    `/api/admin/bug-reports?status=${filter}`,
    fetcher,
  );

  const setStatus = async (id: string, status: "open" | "resolved") => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bug-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Couldn't update the report.");
      }
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const filters: [Filter, string][] = [
    ["open", `Open${data ? ` (${data.counts.open})` : ""}`],
    ["resolved", `Resolved${data ? ` (${data.counts.resolved})` : ""}`],
    ["all", "All"],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-rf-ink">Bug reports</h2>
          <p className="mt-0.5 text-[12.5px] text-rf-ink-mute">
            Sent from &ldquo;Report a bug&rdquo; on the dashboard. Each one is also emailed to you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={`h-8 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors ${
                filter === id
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
        <div className="rounded-xl border border-rf-danger/35 bg-rf-danger-soft px-4 py-3 text-sm text-rf-danger">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-rf-line bg-rf-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-rf-line bg-rf-bg text-left text-[11.5px] font-medium uppercase tracking-[0.02em] text-rf-ink-mute">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Reported by</th>
              <th className="px-4 py-3">What happened</th>
              <th className="px-4 py-3">Where</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && !data ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-rf-ink-mute">Loading…</td>
              </tr>
            ) : !data?.reports.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-rf-ink-mute">
                  {filter === "open" ? "No open bug reports." : "No bug reports here."}
                </td>
              </tr>
            ) : (
              data.reports.map((r) => (
                <tr key={r.id} className="border-t border-rf-line-soft align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-rf-ink-mute">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-rf-ink">{r.userName || "—"}</div>
                    {r.userEmail ? <div className="text-xs text-rf-ink-mute">{r.userEmail}</div> : null}
                  </td>
                  <td className="max-w-[360px] px-4 py-3">
                    <p className="whitespace-pre-wrap break-words text-rf-ink">{r.description}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-rf-ink-mute">
                    {r.pageUrl ? (
                      <a href={r.pageUrl} target="_blank" rel="noopener noreferrer" className="block max-w-[200px] truncate text-rf-plum-ink hover:underline">
                        {r.pageUrl.replace(/^https?:\/\//, "")}
                      </a>
                    ) : null}
                    <div>{browserLabel(r.userAgent)}</div>
                    {r.viewport ? <div>{r.viewport}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                        r.status === "open" ? "bg-rf-amber-bg text-rf-amber-ink" : "bg-rf-success-soft text-rf-success"
                      }`}
                    >
                      {r.status === "open" ? "Open" : "Resolved"}
                    </span>
                    {r.status === "resolved" && r.resolvedAt ? (
                      <div className="mt-1 text-[11px] text-rf-ink-mute">
                        {new Date(r.resolvedAt).toLocaleDateString()}
                      </div>
                    ) : null}
                    {!r.emailed ? <div className="mt-1 text-[11px] text-rf-warn">Email not sent</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {r.userEmail ? (
                        <a
                          href={`mailto:${r.userEmail}?subject=${encodeURIComponent("Re: your Refocus bug report")}`}
                          title="Reply by email"
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-rf-line px-2 text-xs font-medium text-rf-ink hover:bg-rf-line-soft"
                        >
                          <Mail className="h-3.5 w-3.5" /> Reply
                        </a>
                      ) : null}
                      {r.status === "open" ? (
                        <button
                          type="button"
                          onClick={() => void setStatus(r.id, "resolved")}
                          disabled={busyId === r.id}
                          className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md bg-rf-primary px-2.5 text-xs font-medium text-rf-on-primary hover:bg-rf-primary-hover disabled:opacity-50"
                        >
                          <CircleCheck className="h-3.5 w-3.5" /> Resolve
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void setStatus(r.id, "open")}
                          disabled={busyId === r.id}
                          className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-rf-line px-2.5 text-xs font-medium text-rf-ink hover:bg-rf-line-soft disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Reopen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
