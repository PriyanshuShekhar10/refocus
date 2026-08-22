"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Ban,
  ChevronDown,
  Flag,
  History,
  LayoutDashboard,
  LogIn,
  Mail,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Trash2,
  UserX,
  Users,
  UserPlus,
  Video,
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
import { PageRefreshButton } from "@/components/page-refresh";
import AdminMailbox, {
  type MailRecipient,
} from "./AdminMailbox";
import AdminCrew from "./AdminCrew";
import AdminTestCall from "./AdminTestCall";

type AdminSection =
  | "overview"
  | "users"
  | "deleted"
  | "mailbox"
  | "reports"
  | "history"
  | "ip-activity"
  | "logins"
  | "crew"
  | "test-call";

type Stats = {
  users: {
    total: number;
    newThisWeek: number;
    verified: number;
    deleted: number;
  };
  sessions: {
    total: number;
    upcoming: number;
    done: number;
    matchedDone: number;
    fullyCompleted: number;
    partiallyCompleted: number;
    completionRate: number;
  };
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
  lastSeenIp: string | null;
  knownIps: string[];
  lastLoginAt: string | null;
};

type DeletedProfile = {
  id: string;
  userId: string;
  email: string | null;
  username: string | null;
  name: string | null;
  emailVerified: boolean;
  createdAt: string | null;
  deletedAt: string | null;
  lastLoginAt: string | null;
  signupIp: string | null;
  lastLoginIp: string | null;
  lastSeenIp: string | null;
  knownIps: string[];
  wasAdmin: boolean;
  communityBanned: boolean;
  communityMuted: boolean;
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

type LoginRow = {
  id: string;
  at: string | null;
  method: "credentials" | "google";
  ip: string | null;
  userId: string;
  email: string | null;
  username: string | null;
  name: string | null;
};

type LoginUserSummary = {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  createdAt: string | null;
  signupIp: string | null;
  lastLoginIp: string | null;
  lastLoginAt: string | null;
  lastSeenIp: string | null;
  lastSeenAt: string | null;
  knownIps: Array<{
    ip: string;
    firstSeenAt: string;
    lastSeenAt: string;
    count: number;
  }>;
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
    lastSeenIp: string | null;
    lastLoginAt: string | null;
    knownIps: Array<{
      ip: string;
      firstSeenAt: string | null;
      lastSeenAt: string | null;
      count: number;
    }>;
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

type AdminPerson = {
  id: string;
  label: string;
  username: string | null;
  email: string | null;
};

type AdminSessionRow = {
  id: string;
  startTime: string | null;
  endTime: string | null;
  durationMin: number | null;
  sessionType: string;
  status: string;
  inProgress: boolean;
  between: string;
  completion: string;
  completedCount: number;
  attendedCount: number;
  participants: (AdminPerson & { attended?: boolean; completed?: boolean })[];
};

type PendingFriendRequest = {
  id: string;
  createdAt: string | null;
  summary: string;
  from: AdminPerson;
  to: AdminPerson;
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
  { id: "crew", label: "Crew", icon: UserPlus },
  { id: "test-call", label: "Test call", icon: Video },
  { id: "logins", label: "Logins", icon: LogIn },
  { id: "deleted", label: "Deleted", icon: UserX },
  { id: "mailbox", label: "Mailbox", icon: Mail },
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
  "user.email": "Emailed users",
  "crew.add": "Added crew member",
  "crew.remove": "Removed crew member",
  "test_call.create": "Created Daily test call",
  "session.club": "Clubbed sessions",
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

function formatSessionWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function localYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftLocalYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  return localYmd(dt);
}

/** Local calendar-day bounds as ISO for the admin logins API. */
function localDayBounds(ymd: string): { from: string; to: string } {
  const [y, m, d] = ymd.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function completionLabel(kind: string): string {
  switch (kind) {
    case "completed":
      return "Both finished";
    case "partial":
      return "One finished";
    case "left-early":
      return "Left early";
    case "missed":
      return "No shows";
    case "unmatched":
      return "Unmatched";
    case "in-progress":
      return "In progress";
    case "matched":
      return "Matched";
    default:
      return "Open slot";
  }
}

function completionClass(kind: string): string {
  switch (kind) {
    case "completed":
      return "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300";
    case "partial":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
    case "in-progress":
      return "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300";
    case "matched":
      return "bg-[#5D1C6A]/10 text-[#5D1C6A]";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
}

function slotKey(s: AdminSessionRow): string | null {
  if (!s.startTime || s.durationMin == null) return null;
  return `${s.startTime}|${s.durationMin}`;
}

function openSoloLabel(s: AdminSessionRow): string {
  return s.participants[0]?.label || s.between || "Open slot";
}

function SessionsExpandTable({
  rows,
  loading,
  total,
  empty,
  past,
  clubbingKey,
  onClub,
}: {
  rows: AdminSessionRow[];
  loading: boolean;
  total: number;
  empty: string;
  past?: boolean;
  clubbingKey?: string | null;
  onClub?: (keepId: string, absorbId: string) => void;
}) {
  const peersById = (() => {
    if (past || !onClub) return new Map<string, AdminSessionRow[]>();
    const open = rows.filter(
      (s) => s.participants.length === 1 && slotKey(s) != null,
    );
    const bySlot = new Map<string, AdminSessionRow[]>();
    for (const s of open) {
      const key = slotKey(s)!;
      const list = bySlot.get(key) ?? [];
      list.push(s);
      bySlot.set(key, list);
    }
    const map = new Map<string, AdminSessionRow[]>();
    for (const group of bySlot.values()) {
      if (group.length < 2) continue;
      for (const s of group) {
        map.set(
          s.id,
          group.filter((other) => other.id !== s.id),
        );
      }
    }
    return map;
  })();

  const showActions = !past && Boolean(onClub);
  const colSpan = showActions ? 5 : 4;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/80 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Between</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">{past ? "Completed" : "Status"}</th>
            {showActions ? <th className="px-4 py-3">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">
                Loading sessions…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((s) => {
              const peers = peersById.get(s.id) ?? [];
              const busy =
                clubbingKey === s.id ||
                peers.some((p) => clubbingKey === p.id);
              return (
                <tr key={s.id}>
                  <td className="px-4 py-3 align-top">
                    <p className="text-gray-900 dark:text-white">
                      {formatSessionWhen(s.startTime)}
                    </p>
                    <p className="text-xs text-gray-500">
                      until {formatSessionWhen(s.endTime)}
                      {s.durationMin ? ` · ${s.durationMin} min` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {s.between}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
                      {s.participants.map((p) => (
                        <li key={p.id}>
                          {p.username ? (
                            <Link
                              href={`/u/${p.username}`}
                              className="text-[#5D1C6A] hover:underline"
                              target="_blank"
                            >
                              @{p.username}
                            </Link>
                          ) : (
                            <span>{p.label}</span>
                          )}
                          {p.email ? ` · ${p.email}` : ""}
                          {past ? (
                            <span className="ml-1 text-gray-400">
                              {p.completed
                                ? "· finished"
                                : p.attended
                                  ? "· left early"
                                  : "· no show"}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3 align-top capitalize text-gray-700 dark:text-gray-300">
                    {String(s.sessionType).replace(/-/g, " ")}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${completionClass(s.completion)}`}
                    >
                      {completionLabel(s.completion)}
                    </span>
                    {past && s.participants.length >= 2 ? (
                      <p className="mt-1 text-[11px] text-gray-400">
                        {s.completedCount}/{s.participants.length} finished
                      </p>
                    ) : null}
                  </td>
                  {showActions ? (
                    <td className="px-4 py-3 align-top">
                      {peers.length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : peers.length === 1 ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onClub?.(s.id, peers[0].id)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          {busy
                            ? "Clubbing…"
                            : `Club with ${openSoloLabel(peers[0])}`}
                        </button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              disabled={busy}
                              className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              {busy ? "Clubbing…" : "Club with…"}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {peers.map((peer) => (
                              <DropdownMenuItem
                                key={peer.id}
                                disabled={busy}
                                onClick={() => onClub?.(s.id, peer.id)}
                              >
                                {openSoloLabel(peer)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {!loading && total > rows.length ? (
        <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-800">
          Showing {rows.length} of {total}
        </p>
      ) : null}
    </div>
  );
}

function PersonLine({ person }: { person: AdminPerson }) {
  return (
    <span>
      <span className="font-medium text-gray-900 dark:text-white">
        {person.label}
      </span>
      {person.username ? (
        <>
          {" "}
          <Link
            href={`/u/${person.username}`}
            className="text-[#5D1C6A] hover:underline"
            target="_blank"
          >
            @{person.username}
          </Link>
        </>
      ) : null}
      {person.email ? (
        <span className="text-gray-500"> · {person.email}</span>
      ) : null}
    </span>
  );
}

function formatAuditDetails(entry: AuditEntry): string | null {
  if (!entry.details) return null;
  if (entry.action === "user.mute" && entry.details.muteDays) {
    return `${entry.details.muteDays} day${entry.details.muteDays === 1 ? "" : "s"}`;
  }
  return null;
}

function OpsNotifySettings() {
  const [email, setEmail] = useState("priyanshushekhar100@gmail.com");
  const [signup, setSignup] = useState(true);
  const [sessionMatched, setSessionMatched] = useState(true);
  const [saving, setSaving] = useState<"signup" | "sessionMatched" | null>(
    null,
  );

  const applyPayload = (data: {
    email?: string | null;
    signup?: boolean;
    sessionMatched?: boolean;
  }) => {
    if (data.email) setEmail(data.email);
    setSignup(data.signup !== false);
    setSessionMatched(data.sessionMatched !== false);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/ops-notify")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data && typeof data.signup === "boolean") {
          applyPayload(data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setFlag = async (
    key: "signup" | "sessionMatched",
    value: boolean,
  ) => {
    const previous = key === "signup" ? signup : sessionMatched;
    if (key === "signup") setSignup(value);
    else setSessionMatched(value);
    setSaving(key);
    try {
      const res = await fetch("/api/admin/ops-notify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      applyPayload(data);
    } catch {
      if (key === "signup") setSignup(previous);
      else setSessionMatched(previous);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-[#5D1C6A]/10 p-2 text-[#5D1C6A]">
          <Mail className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Founder emails
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Sent to {email}. Turn either off anytime.
          </p>
        </div>
      </div>
      <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
        <OpsNotifyRow
          label="New signups"
          hint="Email and Google accounts."
          checked={signup}
          disabled={saving !== null}
          onChange={(v) => void setFlag("signup", v)}
        />
        <OpsNotifyRow
          label="Session bookings"
          hint="When a posted session gets a match."
          checked={sessionMatched}
          disabled={saving !== null}
          onChange={(v) => void setFlag("sessionMatched", v)}
        />
      </div>
    </div>
  );
}

function OpsNotifyRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-[#5D1C6A]" : "bg-gray-300 dark:bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function AdminPanel() {
  const [section, setSection] = useState<AdminSection>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userQuery, setUserQuery] = useState("");
  const [deletedUsers, setDeletedUsers] = useState<DeletedProfile[]>([]);
  const [deletedTotal, setDeletedTotal] = useState(0);
  const [deletedQuery, setDeletedQuery] = useState("");
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
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const [upcomingSessions, setUpcomingSessions] = useState<AdminSessionRow[]>(
    [],
  );
  const [upcomingSessionsTotal, setUpcomingSessionsTotal] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [clubbingKey, setClubbingKey] = useState<string | null>(null);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [doneSessions, setDoneSessions] = useState<AdminSessionRow[]>([]);
  const [doneSessionsTotal, setDoneSessionsTotal] = useState(0);
  const [doneLoading, setDoneLoading] = useState(false);
  const [friendRequestsExpanded, setFriendRequestsExpanded] = useState(false);
  const [pendingFriendRequests, setPendingFriendRequests] = useState<
    PendingFriendRequest[]
  >([]);
  const [pendingFriendRequestsTotal, setPendingFriendRequestsTotal] =
    useState(0);
  const [friendRequestsLoading, setFriendRequestsLoading] = useState(false);
  const [mailPrefill, setMailPrefill] = useState<MailRecipient[] | null>(null);
  const [mailEpoch, setMailEpoch] = useState(0);
  const [loginMode, setLoginMode] = useState<"day" | "user">("day");
  const [loginDate, setLoginDate] = useState(() => localYmd());
  const [loginUserQuery, setLoginUserQuery] = useState("");
  const [loginUserId, setLoginUserId] = useState<string | null>(null);
  const [loginRows, setLoginRows] = useState<LoginRow[]>([]);
  const [loginCount, setLoginCount] = useState(0);
  const [loginUniqueUsers, setLoginUniqueUsers] = useState(0);
  const [loginUserSummary, setLoginUserSummary] =
    useState<LoginUserSummary | null>(null);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

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

  const loadDeletedUsers = useCallback(
    async (q = deletedQuery) => {
      const params = new URLSearchParams({ limit: "40" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/deleted-users?${params}`);
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to load deleted profiles");
      setDeletedUsers(data.users || []);
      setDeletedTotal(data.total ?? 0);
    },
    [deletedQuery],
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

  const loadLogins = useCallback(async () => {
    const params = new URLSearchParams({ limit: "300" });
    if (loginMode === "user") {
      if (loginUserId) params.set("userId", loginUserId);
      else if (loginUserQuery.trim()) params.set("q", loginUserQuery.trim());
      else {
        setLoginRows([]);
        setLoginCount(0);
        setLoginUniqueUsers(0);
        setLoginUserSummary(null);
        setLoginMessage("Search email or username to see that user’s logins.");
        return;
      }
    } else {
      const { from, to } = localDayBounds(loginDate);
      params.set("from", from);
      params.set("to", to);
      params.set("date", loginDate);
    }

    const res = await fetch(`/api/admin/logins?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load logins");
    setLoginRows(data.logins || []);
    setLoginCount(data.count ?? 0);
    setLoginUniqueUsers(data.uniqueUsers ?? 0);
    setLoginUserSummary(data.user ?? null);
    setLoginMessage(data.message ?? null);
    if (data.user?.id) setLoginUserId(data.user.id);
  }, [loginMode, loginDate, loginUserId, loginUserQuery]);

  const loadUpcomingSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/admin/sessions?limit=80");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions");
      setUpcomingSessions(data.sessions || []);
      setUpcomingSessionsTotal(data.total ?? 0);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const clubSessions = useCallback(
    async (keepId: string, absorbId: string) => {
      const keep = upcomingSessions.find((s) => s.id === keepId);
      const absorb = upcomingSessions.find((s) => s.id === absorbId);
      const keepLabel = keep ? openSoloLabel(keep) : "session A";
      const absorbLabel = absorb ? openSoloLabel(absorb) : "session B";
      if (
        !confirm(
          `Club ${keepLabel} with ${absorbLabel} into one session?\n\n${absorbLabel}'s open slot will be removed. Both people will get a booked-session email.`,
        )
      ) {
        return;
      }
      setClubbingKey(keepId);
      setError(null);
      try {
        const res = await fetch("/api/admin/sessions/club", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keepId, absorbId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "Failed to club sessions",
          );
        }
        await Promise.all([loadUpcomingSessions(), loadStats()]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setClubbingKey(null);
      }
    },
    [upcomingSessions, loadUpcomingSessions, loadStats],
  );

  const loadDoneSessions = useCallback(async () => {
    setDoneLoading(true);
    try {
      const res = await fetch("/api/admin/sessions?scope=done&limit=80");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions");
      setDoneSessions(data.sessions || []);
      setDoneSessionsTotal(data.total ?? 0);
    } finally {
      setDoneLoading(false);
    }
  }, []);

  const loadPendingFriendRequests = useCallback(async () => {
    setFriendRequestsLoading(true);
    try {
      const res = await fetch("/api/admin/friend-requests?limit=80");
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to load friend requests");
      setPendingFriendRequests(data.requests || []);
      setPendingFriendRequestsTotal(data.total ?? 0);
    } finally {
      setFriendRequestsLoading(false);
    }
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
      if (section === "overview") {
        await loadStats();
        if (sessionsExpanded) await loadUpcomingSessions();
        if (doneExpanded) await loadDoneSessions();
        if (friendRequestsExpanded) await loadPendingFriendRequests();
      } else if (section === "users") await loadUsers();
      else if (section === "deleted") await loadDeletedUsers();
      else if (section === "mailbox") setMailEpoch((n) => n + 1);
      else if (section === "reports") await loadReports();
      else if (section === "history") await loadAuditLog();
      else if (section === "ip-activity") await loadIpActivity();
      else if (section === "logins") await loadLogins();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    section,
    sessionsExpanded,
    doneExpanded,
    friendRequestsExpanded,
    loadStats,
    loadUpcomingSessions,
    loadDoneSessions,
    loadPendingFriendRequests,
    loadUsers,
    loadDeletedUsers,
    loadReports,
    loadAuditLog,
    loadIpActivity,
    loadLogins,
  ]);

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
          <PageRefreshButton onRefresh={refresh} />
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
            <OpsNotifySettings />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Users"
                value={stats.users.total}
                hint={`+${stats.users.newThisWeek} this week`}
              />
              <button
                type="button"
                onClick={() => setSection("deleted")}
                className="text-left"
              >
                <StatCard
                  label="Deleted profiles"
                  value={stats.users.deleted}
                  hint="People who deleted their account"
                />
              </button>
              <StatCard
                label="Verified emails"
                value={stats.users.verified}
              />
              <button
                type="button"
                onClick={() => setSessionsExpanded((open) => !open)}
                className="text-left"
                aria-expanded={sessionsExpanded}
              >
                <StatCard
                  label="Upcoming sessions"
                  value={stats.sessions.upcoming}
                  hint={`${stats.sessions.total} total · click to ${sessionsExpanded ? "hide" : "expand"}`}
                />
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${sessionsExpanded ? "rotate-180" : ""}`}
                  />
                  {sessionsExpanded ? "Hide details" : "Show who and when"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDoneExpanded((open) => !open)}
                className="text-left"
                aria-expanded={doneExpanded}
              >
                <StatCard
                  label="Done sessions"
                  value={stats.sessions.done ?? 0}
                  hint={
                    (stats.sessions.matchedDone ?? 0) > 0
                      ? `${formatPercent(stats.sessions.completionRate ?? 0)} both finished · ${stats.sessions.fullyCompleted ?? 0}/${stats.sessions.matchedDone} matched`
                      : "Click to see who finished"
                  }
                />
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${doneExpanded ? "rotate-180" : ""}`}
                  />
                  {doneExpanded ? "Hide details" : "Show who finished"}
                </span>
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Active posts"
                value={stats.community.postsActive}
                hint={`${stats.community.postsDeleted} removed`}
              />
              <StatCard
                label="Chat messages"
                value={stats.globalChat.messagesActive}
                hint={`${stats.globalChat.messagesDeleted} removed`}
              />
              <button
                type="button"
                onClick={() => setFriendRequestsExpanded((open) => !open)}
                className="text-left"
                aria-expanded={friendRequestsExpanded}
              >
                <StatCard
                  label="Pending friend requests"
                  value={stats.moderation.pendingFriendRequests}
                  hint={`Click to ${friendRequestsExpanded ? "hide" : "see from → to"}`}
                />
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${friendRequestsExpanded ? "rotate-180" : ""}`}
                  />
                  {friendRequestsExpanded ? "Hide details" : "Show from and to"}
                </span>
              </button>
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

            {sessionsExpanded ? (
              <SessionsExpandTable
                rows={upcomingSessions}
                loading={sessionsLoading}
                total={upcomingSessionsTotal}
                empty="No upcoming sessions."
                clubbingKey={clubbingKey}
                onClub={clubSessions}
              />
            ) : null}

            {doneExpanded ? (
              <SessionsExpandTable
                rows={doneSessions}
                loading={doneLoading}
                total={doneSessionsTotal}
                empty="No finished sessions yet."
                past
              />
            ) : null}

            {friendRequestsExpanded ? (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/80 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">From</th>
                      <th className="px-4 py-3">To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {friendRequestsLoading ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Loading friend requests…
                        </td>
                      </tr>
                    ) : pendingFriendRequests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No pending friend requests.
                        </td>
                      </tr>
                    ) : (
                      pendingFriendRequests.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3 align-top text-gray-500">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 align-top text-sm">
                            <PersonLine person={r.from} />
                          </td>
                          <td className="px-4 py-3 align-top text-sm">
                            <PersonLine person={r.to} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {!friendRequestsLoading &&
                pendingFriendRequestsTotal > pendingFriendRequests.length ? (
                  <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-800">
                    Showing {pendingFriendRequests.length} of{" "}
                    {pendingFriendRequestsTotal}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {section === "crew" ? <AdminCrew active /> : null}

        {section === "test-call" ? <AdminTestCall active /> : null}

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
                          {u.knownIps?.length || u.lastLoginIp || u.signupIp ? (
                            <div className="mt-0.5 font-mono text-[10px] text-gray-400">
                              {u.lastSeenIp || u.lastLoginIp || u.signupIp}
                              {u.knownIps && u.knownIps.length > 1
                                ? ` · ${u.knownIps.length} IPs`
                                : u.signupIp &&
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
                          {isSelf && !u.email ? (
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
                                {u.email ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setMailPrefill([
                                        {
                                          id: u.id,
                                          email: u.email as string,
                                          name: u.name,
                                          username: u.username,
                                        },
                                      ]);
                                      setSection("mailbox");
                                    }}
                                  >
                                    <Mail className="h-4 w-4" />
                                    Email user
                                  </DropdownMenuItem>
                                ) : null}
                                {u.email && !isSelf ? (
                                  <DropdownMenuSeparator />
                                ) : null}
                                {isSelf ? null : u.isAdmin ? (
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

        {section === "deleted" ? (
          <div className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void loadDeletedUsers();
              }}
            >
              <input
                type="search"
                value={deletedQuery}
                onChange={(e) => setDeletedQuery(e.target.value)}
                placeholder="Search deleted email, username, name, or IP…"
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#5D1C6A] px-4 py-2 text-sm font-medium text-white hover:bg-[#CA5995]"
              >
                Search
              </button>
            </form>
            <p className="text-xs text-gray-500">
              {deletedTotal} deleted profile{deletedTotal === 1 ? "" : "s"}.
              Only accounts deleted after this feature shipped appear here.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/80 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Verified</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Deleted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {deletedUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No deleted profiles yet.
                      </td>
                    </tr>
                  ) : (
                    deletedUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {u.name || "—"}
                          </div>
                          <div className="text-xs text-gray-500">{u.email || "—"}</div>
                          {u.knownIps?.length || u.lastLoginIp || u.signupIp ? (
                            <div className="mt-0.5 font-mono text-[10px] text-gray-400">
                              {u.lastSeenIp || u.lastLoginIp || u.signupIp}
                              {u.knownIps && u.knownIps.length > 1
                                ? ` · ${u.knownIps.length} IPs`
                                : ""}
                            </div>
                          ) : null}
                          {u.wasAdmin || u.communityBanned || u.communityMuted ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {u.wasAdmin ? (
                                <span className="rounded-full bg-[#5D1C6A]/10 px-2 py-0.5 text-[10px] font-medium text-[#5D1C6A]">
                                  Was admin
                                </span>
                              ) : null}
                              {u.communityBanned ? (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                  Banned
                                </span>
                              ) : null}
                              {u.communityMuted ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                  Muted
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {u.username ? `@${u.username}` : "—"}
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
                        <td className="px-4 py-3 text-gray-500">
                          {u.deletedAt
                            ? new Date(u.deletedAt).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {section === "mailbox" ? (
          <AdminMailbox
            key={mailEpoch}
            prefill={mailPrefill}
            onPrefillConsumed={() => setMailPrefill(null)}
          />
        ) : null}

        {section === "logins" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginMode("day");
                  setLoginUserId(null);
                  setLoginUserSummary(null);
                  setLoginMessage(null);
                }}
                className={`rounded-full px-3 py-1 text-sm ${
                  loginMode === "day"
                    ? "bg-[#5D1C6A] text-white"
                    : "border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                By day
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode("user");
                  setLoginRows([]);
                  setLoginCount(0);
                  setLoginUniqueUsers(0);
                  setLoginMessage(
                    "Search email or username to see that user’s full login history.",
                  );
                }}
                className={`rounded-full px-3 py-1 text-sm ${
                  loginMode === "user"
                    ? "bg-[#5D1C6A] text-white"
                    : "border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                By user
              </button>
            </div>

            {loginMode === "day" ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLoginDate(localYmd())}
                  className={`rounded-full px-3 py-1 text-sm ${
                    loginDate === localYmd()
                      ? "bg-[#5D1C6A] text-white"
                      : "border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setLoginDate(shiftLocalYmd(localYmd(), -1))}
                  className={`rounded-full px-3 py-1 text-sm ${
                    loginDate === shiftLocalYmd(localYmd(), -1)
                      ? "bg-[#5D1C6A] text-white"
                      : "border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                  }`}
                >
                  Yesterday
                </button>
                <input
                  type="date"
                  value={loginDate}
                  onChange={(e) => setLoginDate(e.target.value)}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
                />
              </div>
            ) : (
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setLoginUserId(null);
                  void loadLogins();
                }}
              >
                <input
                  type="search"
                  value={loginUserQuery}
                  onChange={(e) => {
                    setLoginUserQuery(e.target.value);
                    setLoginUserId(null);
                  }}
                  placeholder="Email or username…"
                  className="min-w-[16rem] flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#5D1C6A] px-4 py-2 text-sm font-medium text-white hover:bg-[#CA5995]"
                >
                  Look up
                </button>
                {loginUserId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUserId(null);
                      setLoginUserQuery("");
                      setLoginUserSummary(null);
                      setLoginRows([]);
                      setLoginCount(0);
                      setLoginMessage(
                        "Search email or username to see that user’s full login history.",
                      );
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
                  >
                    Clear
                  </button>
                ) : null}
              </form>
            )}

            <p className="text-xs text-gray-500">
              {loginMode === "day"
                ? `${loginCount} sign-ins · ${loginUniqueUsers} unique users · ${loginDate} (local day)`
                : loginUserSummary
                  ? `${loginCount} sign-ins for this user (all time, max 300)`
                  : "Credentials and Google sign-ins only — not page refreshes."}
            </p>
            {loginMessage ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {loginMessage}
              </p>
            ) : null}

            {loginUserSummary ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {loginUserSummary.name ||
                      loginUserSummary.email ||
                      loginUserSummary.username ||
                      loginUserSummary.id}
                  </span>
                  {loginUserSummary.email ? (
                    <span className="text-gray-500">{loginUserSummary.email}</span>
                  ) : null}
                  {loginUserSummary.username ? (
                    <span className="text-gray-500">
                      @{loginUserSummary.username}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-1 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                  <p>
                    Joined:{" "}
                    {loginUserSummary.createdAt
                      ? new Date(loginUserSummary.createdAt).toLocaleString()
                      : "—"}
                  </p>
                  <p>
                    Last login:{" "}
                    {loginUserSummary.lastLoginAt
                      ? new Date(loginUserSummary.lastLoginAt).toLocaleString()
                      : "—"}
                  </p>
                  <p className="font-mono">
                    Signup IP: {loginUserSummary.signupIp || "—"}
                  </p>
                  <p className="font-mono">
                    Last login IP: {loginUserSummary.lastLoginIp || "—"}
                  </p>
                  <p className="font-mono">
                    Last seen IP: {loginUserSummary.lastSeenIp || "—"}
                  </p>
                  <p>
                    Last seen:{" "}
                    {loginUserSummary.lastSeenAt
                      ? new Date(loginUserSummary.lastSeenAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
                {loginUserSummary.knownIps.length > 0 ? (
                  <div className="pt-1">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Known IPs
                    </p>
                    <ul className="space-y-0.5 text-xs font-mono text-gray-600 dark:text-gray-300">
                      {loginUserSummary.knownIps.map((row) => (
                        <li key={row.ip}>
                          {row.ip} · ×{row.count} · last{" "}
                          {new Date(row.lastSeenAt).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/80 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    {loginMode === "day" ? (
                      <th className="px-4 py-3">User</th>
                    ) : null}
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">IP</th>
                    {loginMode === "day" ? (
                      <th className="px-4 py-3 text-right">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {loginRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={loginMode === "day" ? 5 : 3}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        {loginMode === "user" && !loginUserSummary
                          ? "Search for a user to load history."
                          : "No sign-ins in this range."}
                      </td>
                    </tr>
                  ) : (
                    loginRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {row.at
                            ? new Date(row.at).toLocaleString()
                            : "—"}
                        </td>
                        {loginMode === "day" ? (
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {row.name || row.email || row.username || row.userId}
                            </div>
                            <div className="text-xs text-gray-500">
                              {[row.email, row.username ? `@${row.username}` : null]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </td>
                        ) : null}
                        <td className="px-4 py-3 capitalize">{row.method}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {row.ip || "—"}
                        </td>
                        {loginMode === "day" ? (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setLoginMode("user");
                                setLoginUserId(row.userId);
                                setLoginUserQuery(
                                  row.email || row.username || row.userId,
                                );
                              }}
                              className="text-xs font-medium text-[#5D1C6A] hover:underline dark:text-[#FFB090]"
                            >
                              Full history
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
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
              {activity?.user.knownIps?.length ||
              activity?.user.lastLoginIp ||
              activity?.user.signupIp ? (
                <div className="mt-1 space-y-0.5">
                  {(activity.user.knownIps ?? []).length > 0 ? (
                    activity.user.knownIps.map((row) => (
                      <p
                        key={row.ip}
                        className="font-mono text-[10px] text-gray-400"
                      >
                        {row.ip}
                        {row.lastSeenAt &&
                        new Date(row.lastSeenAt).getTime() > 0
                          ? ` · last ${new Date(row.lastSeenAt).toLocaleString()}`
                          : ""}
                        {row.count > 1 ? ` · ×${row.count}` : ""}
                      </p>
                    ))
                  ) : (
                    <p className="font-mono text-[10px] text-gray-400">
                      last {activity.user.lastLoginIp || "—"}
                      {activity.user.signupIp
                        ? ` · signup ${activity.user.signupIp}`
                        : ""}
                    </p>
                  )}
                </div>
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
