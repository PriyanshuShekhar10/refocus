"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Video } from "lucide-react";
import { DURATION_OPTIONS, type DurationMin } from "@/constants/calendar";

type ActiveTestCall = {
  sessionId: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  callPagePath: string;
  createdByUserId: string;
};

type CreateResponse = ActiveTestCall & {
  ok: true;
  roomName: string;
  domain: string;
  token: string;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminTestCall({ active }: { active: boolean }) {
  const [durationMin, setDurationMin] = useState<DurationMin>(25);
  const [sessions, setSessions] = useState<ActiveTestCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<CreateResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/test-call");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load test calls");
      setSessions(data.sessions || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const createTestCall = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/test-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create test call");
      setLastCreated(data as CreateResponse);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-rf-ink">
          Daily.co test call
        </h2>
        <p className="mt-1 text-sm text-rf-ink-mute">
          Spin up a real session room to verify camera, mic, and Daily.co
          integration without booking through the calendar.
        </p>
      </div>

      <div className="rounded-xl border border-rf-line bg-rf-card p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-rf-ink-mute">
              Duration
            </span>
            <select
              value={durationMin}
              onChange={(e) =>
                setDurationMin(Number(e.target.value) as DurationMin)
              }
              disabled={creating}
              className="rounded-lg border border-rf-line bg-rf-card px-3 py-2 text-sm"
            >
              {DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void createTestCall()}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-rf-primary px-4 py-2 text-sm font-medium text-rf-on-primary hover:bg-rf-primary-hover disabled:opacity-60"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Video className="h-4 w-4" aria-hidden />
            )}
            {creating ? "Creating…" : "Create test call"}
          </button>
        </div>

        {lastCreated ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            <p className="font-medium">Test call ready</p>
            <p className="mt-1 text-xs opacity-90">
              Room <code>{lastCreated.roomName}</code> · ends{" "}
              {formatWhen(lastCreated.endTime)}
            </p>
            <Link
              href={lastCreated.callPagePath}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Join test call
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-rf-line bg-rf-card p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-rf-ink-mute">
            Active test calls
          </p>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="text-xs text-rf-ink-mute hover:text-rf-ink"
          >
            Refresh
          </button>
        </div>
        {loading && sessions.length === 0 ? (
          <p className="mt-3 text-sm text-rf-ink-mute">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="mt-3 text-sm text-rf-ink-mute">
            No active test calls. Create one above to join a room.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-rf-line-soft">
            {sessions.map((session) => (
              <li
                key={session.sessionId}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-rf-ink">
                    {session.durationMin} min · {formatWhen(session.startTime)}
                  </p>
                  <p className="text-xs text-rf-ink-mute">
                    Ends {formatWhen(session.endTime)}
                  </p>
                </div>
                <Link
                  href={session.callPagePath}
                  className="inline-flex items-center gap-1 rounded-lg border border-rf-line px-3 py-1.5 text-sm hover:bg-rf-line-soft"
                >
                  Join
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
