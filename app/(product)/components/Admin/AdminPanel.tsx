"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Ban,
  History,
  LayoutDashboard,
  MoreHorizontal,
  RefreshCw,
  Shield,
  ShieldOff,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AdminSection = "overview" | "users" | "history";

type Stats = {
  users: { total: number; newThisWeek: number; verified: number };
  sessions: { total: number; upcoming: number };
  community: { postsActive: number; postsDeleted: number };
  globalChat: { messagesActive: number; messagesDeleted: number };
  moderation: {
    pendingFriendRequests: number;
    pendingSessionRequests: number;
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

const SECTIONS: {
  id: AdminSection;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
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
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (section === "overview") await loadStats();
      else if (section === "users") await loadUsers();
      else if (section === "history") await loadAuditLog();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [section, loadStats, loadUsers, loadAuditLog]);

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
      await loadUsers();
      await loadAuditLog();
    } catch (e) {
      alert((e as Error).message);
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                placeholder="Search email, username, or name…"
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
                      <tr key={u.id}>
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
                        </td>
                        <td className="px-4 py-3">
                          {u.username ? (
                            <Link
                              href={`/u/${u.username}`}
                              className="text-[#5D1C6A] hover:underline"
                              target="_blank"
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
                        <td className="px-4 py-3 text-right">
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
        auditEntries.length === 0 ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : null}
      </div>
    </div>
  );
}
