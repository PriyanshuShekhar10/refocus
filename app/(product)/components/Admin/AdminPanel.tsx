"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Ban,
  Flag,
  History,
  LayoutDashboard,
  MoreHorizontal,
  RefreshCw,
  Shield,
  ShieldOff,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AdminSection = "overview" | "users" | "reports" | "history" | "ip-activity";

type Stats = {
  users: { total: number; newThisWeek: number; verified: number };
  sessions: { total: number; upcoming: number };
  community: { postsActive: number; postsDeleted: number };
  globalChat: { messagesActive: number; messagesDeleted: number };
  moderation: {
    pendingFriendRequests: number;
    pendingSessionRequests: number;
    pendingReports: number;
    bannedIpActivityWeek: number;
  };
};

type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  emailVerified: boolean;
  createdAt: string | null;
  hasAvatar: boolean;
  isAdmin: boolean;
  communityBanned: boolean;
  communityMuted: boolean;
  signupIp: string | null;
  lastLoginIp: string | null;
  lastLoginAt: string | null;
};

type IpActivityEntry = {
  id: string;
  ip: string | null;
  attemptedEmail: string | null;
  outcome: string;
  createdUserId: string | null;
  matchedBannedUsers: { id: string; email: string | null; label: string }[];
  createdAt: string | null;
};

type UserActivityEvent = {
  type: string;
  at: string;
  summary: string;
};

type UserActivityPayload = {
  user: {
    id: string;
    email: string | null;
    username: string | null;
    name: string | null;
    signupIp: string | null;
    lastLoginIp: string | null;
    lastLoginAt: string | null;
    createdAt: string | null;
    emailVerified: boolean;
    communityBanned: boolean;
    communityMuted: boolean;
  };
  events: UserActivityEvent[];
};

type AuditEntry = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetUserId: string | null;
  targetUserEmail: string | null;
  targetLabel: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string | null;
};

type ReportEntry = {
  id: string;
  reporterEmail: string | null;
  reportedUserLabel: string | null;
  reportedUserEmail: string | null;
  targetType: string;
  targetTypeLabel: string;
  targetId: string;
  reasonLabel: string;
  details: string | null;
  contentSnapshot: string | null;
  status: string;
  clusterReportCount: number;
  clusterReporterEmails: string[];
  createdAt: string | null;
};

const SECTIONS: {
  id: AdminSection;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "ip-activity", label: "Banned IP activity", icon: Activity },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "history", label: "History", icon: History },
];

const ACTION_LABELS: Record<string, string> = {
  "user.ban": "Banned from community",
  "user.unban": "Unbanned from community",
  "user.mute": "Muted in community",
  "user.unmute": "Unmuted in community",
  "user.grant_admin": "Granted admin role",
  "user.revoke_admin": "Revoked admin role",
  "post.delete": "Deleted community post",
  "comment.delete": "Deleted comment",
  "chat.delete": "Deleted chat message",
  "friend_message.delete": "Deleted friend message",
  "report.dismiss": "Dismissed report",
  "report.resolve": "Resolved report",
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

function formatAuditDetails(entry: AuditEntry): string | null {
  if (!entry.details) return null;
  if (entry.action === "user.mute" && entry.details.muteDays) {
    return `${entry.details.muteDays} day${entry.details.muteDays === 1 ? "" : "s"}`;
  }
  return null;
}

export default function AdminPanel() {
  const [section, setSection] = useState<AdminSection>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userQuery, setUserQuery] = useState("");
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportFilter, setReportFilter] = useState<"pending" | "all">("pending");
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [ipEntries, setIpEntries] = useState<IpActivityEntry[]>([]);
  const [activityUserId, setActivityUserId] = useState<string | null>(null);
  const [activity, setActivity] = useState<UserActivityPayload | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.userId) setCurrentAdminId(data.userId);
      })
      .catch(() => {});
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load stats");
    setStats(data);
  }, []);

  const loadUsers = useCallback(
    async (q = userQuery) => {
      const params = new URLSearchParams({ limit: "40" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data.users || []);
      setUserTotal(data.total ?? 0);
    },
    [userQuery],
  );

  const loadAuditLog = useCallback(async () => {
    const res = await fetch("/api/admin/audit-log?limit=60");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load history");
    setAuditEntries(data.entries || []);
    setAuditTotal(data.total ?? 0);
  }, []);

  const loadReports = useCallback(async (status = reportFilter) => {
    const params = new URLSearchParams({ limit: "50", status });
    const res = await fetch(`/api/admin/reports?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load reports");
    setReports(data.reports || []);
    setReportsTotal(data.total ?? 0);
  }, [reportFilter]);

  const loadIpActivity = useCallback(async () => {
    const res = await fetch("/api/admin/banned-ip-activity?limit=80");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load IP activity");
    setIpEntries(data.entries || []);
  }, []);

  const loadUserActivity = useCallback(async (userId: string) => {
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/activity`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load activity");
      setActivity(data);
    } catch (e) {
      setActivity(null);
      alert((e as Error).message);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (section === "overview") await loadStats();
      else if (section === "users") await loadUsers();
      else if (section === "reports") await loadReports();
      else if (section === "history") await loadAuditLog();
      else if (section === "ip-activity") await loadIpActivity();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [section, loadStats, loadUsers, loadReports, loadAuditLog, loadIpActivity]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runUserAction = async (
    userId: string,
    fn: () => Promise<Response>,
  ) => {
    setActionId(userId);
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed");
      await Promise.all([
        loadUsers(),
        loadAuditLog(),
        loadReports(),
        loadStats().catch(() => {}),
      ]);
    } catch (e) {
      const message = (e as Error).message;
      if (message !== "cancelled") alert(message);
    } finally {
      setActionId(null);
    }
  };

  const moderateUser = (userId: string, action: string, muteDays?: number) =>
    runUserAction(userId, () =>
      fetch(`/api/admin/community/users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, muteDays }),
      }),
    );

  const setAdminRole = (userId: string, action: "grant" | "revoke") =>
    runUserAction(userId, () =>
      fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }),
    );

  const resolveReport = (
    reportId: string,
    resolution: "dismiss" | "delete_content" | "mute" | "ban",
    confirmMessage: string,
  ) => {
    if (!confirm(confirmMessage)) return;
    runUserAction(reportId, () =>
      fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          muteDays: resolution === "mute" ? 7 : undefined,
        }),
      }),
    );
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Admin
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage users, roles, and bans. Content moderation lives in
              Community.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                section === id
                  ? "bg-[#5D1C6A] text-white"
                  : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {section === "overview" && stats ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Users"
                value={stats.users.total}
                hint={`+${stats.users.newThisWeek} this week`}
              />
              <StatCard
                label="Verified emails"
                value={stats.users.verified}
              />
              <StatCard
                label="Upcoming sessions"
                value={stats.sessions.upcoming}
                hint={`${stats.sessions.total} total`}
              />
              <StatCard
                label="Active posts"
                value={stats.community.postsActive}
                hint={`${stats.community.postsDeleted} removed`}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Chat messages"
                value={stats.globalChat.messagesActive}
                hint={`${stats.globalChat.messagesDeleted} removed`}
              />
              <StatCard
                label="Pending friend requests"
                value={stats.moderation.pendingFriendRequests}
              />
              <StatCard
                label="Pending session requests"
                value={stats.moderation.pendingSessionRequests}
              />
              <button
                type="button"
                onClick={() => setSection("reports")}
                className="text-left"
              >
                <StatCard
                  label="Pending reports"
                  value={stats.moderation.pendingReports}
                  hint="Open reports queue"
                />
              </button>
              <button
                type="button"
                onClick={() => setSection("ip-activity")}
                className="text-left"
              >
                <StatCard
                  label="Banned IP signups"
                  value={stats.moderation.bannedIpActivityWeek ?? 0}
                  hint="Last 7 days · watch only, not blocked"
                />
              </button>
            </div>
          </div>
        ) : null}

        {section === "users" ? (
          <div className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                loadUsers();
              }}
            >
              <input
                type="search"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search email, username, name, or IP…"
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#5D1C6A] px-4 py-2 text-sm font-medium text-white hover:bg-[#CA5995]"
              >
                Search
              </button>
            </form>
            <p className="text-xs text-gray-500">{userTotal} users</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/80 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Verified</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {users.map((u) => {
                    const isSelf = u.id === currentAdminId;
                    const busy = actionId === u.id;

                    return (
                      <tr
                        key={u.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
                        onClick={() => {
                          setActivityUserId(u.id);
                          void loadUserActivity(u.id);
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {u.name || "—"}
                            {isSelf ? (
                              <span className="ml-1.5 text-xs text-gray-400">
                                (you)
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                          {u.lastLoginIp || u.signupIp ? (
                            <div className="mt-0.5 font-mono text-[10px] text-gray-400">
                              {u.lastLoginIp || u.signupIp}
                              {u.signupIp &&
                              u.lastLoginIp &&
                              u.signupIp !== u.lastLoginIp
                                ? ` · signup ${u.signupIp}`
                                : ""}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {u.username ? (
                            <Link
                              href={`/u/${u.username}`}
                              className="text-[#5D1C6A] hover:underline"
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                            >
                              @{u.username}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {u.isAdmin ? (
                              <span className="rounded-full bg-[#5D1C6A]/10 px-2 py-0.5 text-[10px] font-medium text-[#5D1C6A]">
                                Admin
                              </span>
                            ) : null}
                            {u.communityBanned ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                Banned
                              </span>
                            ) : null}
                            {u.communityMuted && !u.communityBanned ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                Muted
                              </span>
                            ) : null}
                            {!u.isAdmin &&
                            !u.communityBanned &&
                            !u.communityMuted ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {u.emailVerified ? (
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-amber-600">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isSelf ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                                  aria-label="User actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                {u.isAdmin ? (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      if (
                                        !confirm(
                                          `Revoke admin role from ${u.name || u.email}?`,
                                        )
                                      ) {
                                        return;
                                      }
                                      setAdminRole(u.id, "revoke");
                                    }}
                                  >
                                    <ShieldOff className="h-4 w-4" />
                                    Revoke admin
                                  </DropdownMenuItem>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (
                                          !confirm(
                                            `Grant admin role to ${u.name || u.email}?`,
                                          )
                                        ) {
                                          return;
                                        }
                                        setAdminRole(u.id, "grant");
                                      }}
                                    >
                                      <Shield className="h-4 w-4" />
                                      Make admin
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {u.communityBanned ? (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          moderateUser(u.id, "unban")
                                        }
                                      >
                                        <Ban className="h-4 w-4" />
                                        Unban from community
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => {
                                          if (
                                            !confirm(
                                              `Ban ${u.name || u.email} from community? They cannot post, chat, or book sessions.`,
                                            )
                                          ) {
                                            return;
                                          }
                                          moderateUser(u.id, "ban");
                                        }}
                                      >
                                        <Ban className="h-4 w-4" />
                                        Ban from community
                                      </DropdownMenuItem>
                                    )}
                                    {u.communityMuted ? (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          moderateUser(u.id, "unmute")
                                        }
                                      >
                                        <Volume2 className="h-4 w-4" />
                                        Unmute
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          if (
                                            !confirm(
                                              `Mute ${u.name || u.email} for 7 days?`,
                                            )
                                          ) {
                                            return;
                                          }
                                          moderateUser(u.id, "mute", 7);
                                        }}
                                      >
                                        <VolumeX className="h-4 w-4" />
                                        Mute 7 days
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {section === "ip-activity" ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Signup attempts from IPs used by banned accounts. Signups are not
              blocked.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/80 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">Attempted email</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Matches banned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {ipEntries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No watched-IP signup attempts yet.
                      </td>
                    </tr>
                  ) : (
                    ipEntries.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-gray-500">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {row.ip || "—"}
                        </td>
                        <td className="px-4 py-3">{row.attemptedEmail || "—"}</td>
                        <td className="px-4 py-3 capitalize">
                          {String(row.outcome).replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                          {row.matchedBannedUsers
                            .map((u) => u.label)
                            .join(", ") || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {section === "reports" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setReportFilter("pending");
                  loadReports("pending");
                }}
                className={`rounded-full px-3 py-1 text-sm ${
                  reportFilter === "pending"
                    ? "bg-[#5D1C6A] text-white"
                    : "border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportFilter("all");
                  loadReports("all");
                }}
                className={`rounded-full px-3 py-1 text-sm ${
                  reportFilter === "all"
                    ? "bg-[#5D1C6A] text-white"
                    : "border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                All
              </button>
            </div>
            <p className="text-xs text-gray-500">{reportsTotal} reports</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/80 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Reported</th>
                    <th className="px-4 py-3">Preview</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Reporters</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {reports.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No reports in this view.
                      </td>
                    </tr>
                  ) : (
                    reports.map((r) => {
                      const busy = actionId === r.id;
                      const canDelete =
                        r.targetType !== "session_call" &&
                        r.targetType !== "user" &&
                        r.status === "pending";
                      return (
                        <tr key={r.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3">{r.targetTypeLabel}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {r.reportedUserLabel || r.reportedUserEmail || "—"}
                            </div>
                            {r.reportedUserEmail ? (
                              <div className="text-xs text-gray-500">
                                {r.reportedUserEmail}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="line-clamp-2 text-gray-600 dark:text-gray-300">
                              {r.contentSnapshot || "—"}
                            </p>
                            {r.details ? (
                              <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                                {r.details}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{r.reasonLabel}</td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-600 dark:text-gray-300">
                              {r.clusterReportCount} report
                              {r.clusterReportCount === 1 ? "" : "s"}
                            </div>
                            <div className="text-[10px] text-gray-500 line-clamp-2">
                              {r.clusterReporterEmails.join(", ")}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {r.status === "pending" ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                                    aria-label="Report actions"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      resolveReport(
                                        r.id,
                                        "dismiss",
                                        "Dismiss this report?",
                                      )
                                    }
                                  >
                                    Dismiss
                                  </DropdownMenuItem>
                                  {canDelete ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        resolveReport(
                                          r.id,
                                          "delete_content",
                                          "Delete the reported content?",
                                        )
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete content
                                    </DropdownMenuItem>
                                  ) : null}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      resolveReport(
                                        r.id,
                                        "mute",
                                        `Mute ${r.reportedUserLabel || "user"} for 7 days?`,
                                      )
                                    }
                                  >
                                    <VolumeX className="h-4 w-4" />
                                    Mute 7 days
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      resolveReport(
                                        r.id,
                                        "ban",
                                        `Ban ${r.reportedUserLabel || "user"} from community?`,
                                      )
                                    }
                                  >
                                    <Ban className="h-4 w-4" />
                                    Ban from community
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-xs capitalize text-gray-500">
                                {r.status.replace("_", " ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {section === "history" ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              {auditTotal} admin actions logged
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/80 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {auditEntries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No admin actions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {entry.createdAt
                            ? new Date(entry.createdAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 dark:text-white">
                            {entry.actorEmail || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {ACTION_LABELS[entry.action] || entry.action}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 dark:text-white">
                            {entry.targetLabel ||
                              entry.targetUserEmail ||
                              "—"}
                          </div>
                          {entry.targetUserEmail &&
                          entry.targetLabel !== entry.targetUserEmail ? (
                            <div className="text-xs text-gray-500">
                              {entry.targetUserEmail}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatAuditDetails(entry) ||
                            entry.resourceId ||
                            "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {loading &&
        !stats &&
        users.length === 0 &&
        auditEntries.length === 0 &&
        reports.length === 0 ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : null}
      </div>

      {activityUserId ? (
        <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {activity?.user.name || activity?.user.email || "User activity"}
              </p>
              <p className="truncate text-xs text-gray-500">
                {activity?.user.email}
                {activity?.user.username ? ` · @${activity.user.username}` : ""}
              </p>
              {activity?.user.lastLoginIp || activity?.user.signupIp ? (
                <p className="mt-1 font-mono text-[10px] text-gray-400">
                  last {activity.user.lastLoginIp || "—"}
                  {activity.user.signupIp
                    ? ` · signup ${activity.user.signupIp}`
                    : ""}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setActivityUserId(null);
                setActivity(null);
              }}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close activity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {activityLoading ? (
              <p className="text-sm text-gray-500">Loading activity…</p>
            ) : (
              <ul className="space-y-3">
                {(activity?.events ?? []).map((ev, i) => (
                  <li key={`${ev.type}-${ev.at}-${i}`} className="text-sm">
                    <p className="text-[11px] text-gray-400">
                      {new Date(ev.at).toLocaleString()} · {ev.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-gray-800 dark:text-gray-200">{ev.summary}</p>
                  </li>
                ))}
                {!activityLoading && (activity?.events.length ?? 0) === 0 ? (
                  <li className="text-sm text-gray-500">No activity yet.</li>
                ) : null}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
