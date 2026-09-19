export type DayCounts = {
  date: string;
  created: number;
  deleted: number;
  joined: number;
  attended: number;
  finished: number;
  qualifying: number;
};

export type CrewMemberStats = {
  email: string;
  name: string | null;
  userId: string | null;
  today: DayCounts;
  days: DayCounts[];
  inactiveDays: number;
};

export type CrewStatsPayload = {
  days: number;
  timezone: string;
  todayKey: string;
  /** Inclusive IST range start (YYYY-MM-DD) */
  fromKey: string;
  /** Inclusive IST range end (YYYY-MM-DD), same as todayKey */
  toKey: string;
  members: CrewMemberStats[];
};

export type MetricKey = Exclude<keyof DayCounts, "date" | "qualifying">;

export const CREW_METRICS: { key: MetricKey; label: string }[] = [
  { key: "created", label: "Created" },
  { key: "deleted", label: "Deleted" },
  { key: "joined", label: "Joined" },
  { key: "attended", label: "Attended" },
  { key: "finished", label: "Finished" },
];

/** Distinct stroke colors for the multi-metric crew chart. */
export const CREW_METRIC_COLORS: Record<MetricKey, string> = {
  created: "#2563eb", // blue
  deleted: "#dc2626", // red
  joined: "#d97706", // amber
  attended: "#059669", // emerald
  finished: "#7c3aed", // violet
};

export const CREW_DEFAULT_DAYS = 30;
/** Lookback used for the All time filter (matches crew streak history). */
export const CREW_ALL_TIME_DAYS = 365;

export type CrewRangeMode = 30 | "all";

export function crewFetchDays(mode: CrewRangeMode): number {
  return mode === "all" ? CREW_ALL_TIME_DAYS : CREW_DEFAULT_DAYS;
}

export function parseCrewRangeMode(
  raw: string | null | undefined,
): CrewRangeMode {
  if (!raw) return CREW_DEFAULT_DAYS;
  if (raw === "all") return "all";
  const n = Number(raw);
  if (Number.isFinite(n) && n > CREW_DEFAULT_DAYS) return "all";
  return CREW_DEFAULT_DAYS;
}

export function crewRangeQuery(mode: CrewRangeMode): string {
  return mode === "all" ? "all" : String(CREW_DEFAULT_DAYS);
}

export const CREW_DAYS_PAGE_SIZE = 7;

export function dayHasAnyActivity(day: DayCounts): boolean {
  return (
    day.created > 0 ||
    day.deleted > 0 ||
    day.joined > 0 ||
    day.attended > 0 ||
    day.finished > 0 ||
    day.qualifying > 0
  );
}

/** Sum metrics across a day series (used for list totals over the selected range). */
export function sumCrewDays(days: DayCounts[]): Omit<DayCounts, "date"> {
  const total = {
    created: 0,
    deleted: 0,
    joined: 0,
    attended: 0,
    finished: 0,
    qualifying: 0,
  };
  for (const day of days) {
    total.created += day.created;
    total.deleted += day.deleted;
    total.joined += day.joined;
    total.attended += day.attended;
    total.finished += day.finished;
    total.qualifying += day.qualifying;
  }
  return total;
}

/** Days in a range with 3+ qualifying sessions. */
export function countCompliantDays(days: DayCounts[]): number {
  return days.filter((d) => d.qualifying >= 3).length;
}

export const CREW_ACTIVITY_FORMULA = {
  title: "How activity is measured",
  sections: [
    {
      heading: "Compliant days",
      body: "Calendar days in the selected range with 3 or more qualifying sessions.",
    },
    {
      heading: "Inactive days",
      body: "Consecutive days of inactivity as of today — how long since the last compliant day (today counts if still below 3). Not affected by the 30-day / All time filter.",
    },
    {
      heading: "Qualifying session",
      body: "Counts once per day toward the daily total when you:",
      counts: [
        "Create an unmatched slot (no partner yet)",
        "Join someone else's session",
        "Create a matched slot and join the call",
      ],
      excludes: [
        "Matched but never joined the call",
        "Deleted sessions",
        "Deleting a session alone (not activity)",
      ],
    },
  ],
} as const;

/** Format an IST calendar day key (YYYY-MM-DD) for display. */
export function formatCrewDayLabel(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  // Interpret as a pure calendar date (UTC noon avoids DST edge cases).
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatCrewDateRange(fromKey: string, toKey: string): string {
  if (fromKey === toKey) return formatCrewDayLabel(fromKey);
  return `${formatCrewDayLabel(fromKey)} – ${formatCrewDayLabel(toKey)}`;
}

export function filterCrewDays(
  days: DayCounts[],
  mode: "activity" | "metric" | "all",
  metric: MetricKey,
): DayCounts[] {
  if (mode === "all") return days;
  if (mode === "metric") return days.filter((d) => d[metric] > 0);
  return days.filter(dayHasAnyActivity);
}

export function crewMemberPath(email: string): string {
  return `/crew/m/${encodeURIComponent(email)}`;
}

export function decodeCrewMemberParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}

export type CrewListRow = {
  member: CrewMemberStats;
  totals: Omit<DayCounts, "date">;
  compliantDays: number;
};

export type CrewSortKey =
  | "person"
  | MetricKey
  | "compliantDays"
  | "inactiveDays";

export type CrewSortDir = "asc" | "desc";

export const CREW_SORT_LABELS: Record<CrewSortKey, string> = {
  person: "Person",
  created: "Created",
  deleted: "Deleted",
  joined: "Joined",
  attended: "Attended",
  finished: "Finished",
  compliantDays: "Compliant days",
  inactiveDays: "Inactive days",
};

export function defaultCrewSortDir(key: CrewSortKey): CrewSortDir {
  return key === "person" ? "asc" : "desc";
}

export function nextCrewSort(
  currentKey: CrewSortKey,
  currentDir: CrewSortDir,
  nextKey: CrewSortKey,
): { key: CrewSortKey; dir: CrewSortDir } {
  if (currentKey === nextKey) {
    return { key: nextKey, dir: currentDir === "asc" ? "desc" : "asc" };
  }
  return { key: nextKey, dir: defaultCrewSortDir(nextKey) };
}

function crewSortValue(row: CrewListRow, key: CrewSortKey): string | number {
  if (key === "person") {
    return (row.member.name || "Unnamed").toLocaleLowerCase("en");
  }
  if (key === "compliantDays") return row.compliantDays;
  if (key === "inactiveDays") return row.member.inactiveDays;
  return row.totals[key];
}

export function sortCrewMemberRows(
  rows: CrewListRow[],
  key: CrewSortKey,
  dir: CrewSortDir,
): CrewListRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = crewSortValue(a, key);
    const bv = crewSortValue(b, key);
    const cmp =
      typeof av === "string" && typeof bv === "string"
        ? av.localeCompare(bv)
        : Number(av) - Number(bv);
    if (cmp !== 0) return cmp * mul;
    return a.member.email.localeCompare(b.member.email);
  });
}
