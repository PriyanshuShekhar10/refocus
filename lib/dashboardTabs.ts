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
  | "admin";

/** Sections that can be opened from `?tab=` (admin is checked separately). */
export const DASHBOARD_TABS: readonly DashboardTab[] = [
  "profile",
  "dashboard",
  "sessions",
  "settings",
  "friends",
  "community",
  "matches",
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
export function urlForTab(tab: DashboardTab): string {
  return tab === "dashboard" ? "/dashboard" : `/dashboard?tab=${tab}`;
}

/** Sections that show the right sidebar beside them on desktop. */
export function showsRightSidebar(tab: DashboardTab): boolean {
  return tab !== "admin" && tab !== "backlog";
}
