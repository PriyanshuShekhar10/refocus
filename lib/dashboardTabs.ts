/**
 * Dashboard sections and how they map to the URL (`/dashboard?tab=…`), so a
 * refresh or a shared link reopens the same section.
 */

export type DashboardTab =
  | "profile"
  | "dashboard"
  | "sessions"
  | "backlog"
  | "settings"
  | "friends"
  | "community"
  | "matches"
  | "admin"
  /** Someone's profile, opened in place: `?tab=user&u=<username>`. */
  | "user";

/** Sections that can be opened from `?tab=` (admin is checked separately). */
export const DASHBOARD_TABS: readonly DashboardTab[] = [
  "profile",
  "dashboard",
  "sessions",
  "settings",
  "friends",
  "community",
  "matches",
  "user",
];

/** The section a `?tab=` value asks for, or null when it isn't one the user can open. */
export function tabFromParam(
  value: string | null | undefined,
  { isAdmin }: { isAdmin: boolean },
): DashboardTab | null {
  if (!value) return null;
  if (value === "admin") return isAdmin ? "admin" : null;
  return (DASHBOARD_TABS as readonly string[]).includes(value) ? (value as DashboardTab) : null;
}

/** Address for a section: the calendar is plain `/dashboard`. */
export function urlForTab(tab: DashboardTab, opts: { username?: string | null } = {}): string {
  if (tab === "dashboard") return "/dashboard";
  if (tab === "user" && opts.username) {
    return `/dashboard?tab=user&u=${encodeURIComponent(opts.username)}`;
  }
  return `/dashboard?tab=${tab}`;
}

/** Someone's profile, shown inside the dashboard rather than on its own page. */
export function profileHref(username: string): string {
  return urlForTab("user", { username });
}

/** Sections that show the right sidebar beside them on desktop. */
export function showsRightSidebar(tab: DashboardTab): boolean {
  return tab !== "admin" && tab !== "backlog";
}
