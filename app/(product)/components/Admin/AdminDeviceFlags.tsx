"use client";

import useSWR from "swr";

type Signal = "cookie" | "fingerprint";

type FlaggedAccount = {
  userId: string;
  email: string | null;
  username: string | null;
  name: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  count: number;
  lastIp: string | null;
  firstSeenSource: "login" | "signup";
};

type FlaggedDevice = {
  signals: Signal[];
  accountCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  accounts: FlaggedAccount[];
  sharedIps: string[];
};

type DeviceFlagsResponse = { count: number; devices: FlaggedDevice[] };

function accountLabel(a: FlaggedAccount): string {
  return a.name || a.username || a.email || a.userId;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const SIGNAL_LABEL: Record<Signal, string> = {
  cookie: "Cookie",
  fingerprint: "Browser fingerprint",
};

export default function AdminDeviceFlags() {
  const { data, error, isLoading } = useSWR<DeviceFlagsResponse>(
    "/api/admin/device-flags",
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Couldn't load device flags.");
      return res.json();
    },
  );

  const devices = data?.devices ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-rf-ink">Device flags</h2>
        <p className="mt-0.5 text-xs text-rf-ink-mute">
          Accounts that logged in from the same browser/device cookie or the
          same browser fingerprint. Accounts sharing a browser/device aren&apos;t
          necessarily the same person — shared or public computers produce
          this too. Treat as a signal, not proof. Admin, demo, and engagement
          crew accounts are excluded.
        </p>
      </div>

      {isLoading ? (
        <p className="text-xs text-rf-ink-mute">Loading…</p>
      ) : error ? (
        <p className="text-xs text-rf-rose">{(error as Error).message}</p>
      ) : devices.length === 0 ? (
        <p className="text-xs text-rf-ink-mute">No flagged devices right now.</p>
      ) : (
        <div className="space-y-3">
          {devices.map((d, i) => (
            <div
              key={i}
              className="rounded-lg border border-rf-line-soft bg-rf-surface p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {d.signals.map((s) => (
                    <span
                      key={s}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        s === "cookie"
                          ? "bg-rf-primary/15 text-rf-primary"
                          : "bg-rf-rose/15 text-rf-rose"
                      }`}
                    >
                      {SIGNAL_LABEL[s]}
                    </span>
                  ))}
                  {d.signals.length > 1 ? (
                    <span className="rounded-full bg-rf-ink/10 px-2 py-0.5 text-[10px] font-medium text-rf-ink">
                      High confidence
                    </span>
                  ) : null}
                </div>
                <span className="text-[11px] text-rf-ink-mute">
                  Last seen {formatWhen(d.lastSeenAt)}
                </span>
              </div>

              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="text-left text-rf-ink-mute">
                    <th className="py-1 pr-2 font-medium">Account</th>
                    <th className="py-1 pr-2 font-medium">First seen</th>
                    <th className="py-1 pr-2 font-medium">Last seen</th>
                    <th className="py-1 pr-2 font-medium">Logins</th>
                    <th className="py-1 font-medium">First as</th>
                  </tr>
                </thead>
                <tbody>
                  {d.accounts.map((a) => (
                    <tr key={a.userId} className="border-t border-rf-line-soft/60">
                      <td className="py-1 pr-2 text-rf-ink">{accountLabel(a)}</td>
                      <td className="py-1 pr-2 text-rf-ink-mute">{formatWhen(a.firstSeenAt)}</td>
                      <td className="py-1 pr-2 text-rf-ink-mute">{formatWhen(a.lastSeenAt)}</td>
                      <td className="py-1 pr-2 text-rf-ink-mute">{a.count}</td>
                      <td className="py-1 text-rf-ink-mute">{a.firstSeenSource}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {d.sharedIps.length > 0 ? (
                <p className="mt-2 text-[11px] text-rf-ink-mute">
                  Also shared IP{d.sharedIps.length > 1 ? "s" : ""}: {d.sharedIps.join(", ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
