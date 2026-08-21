export type DayCounts = {
  date: string;
  created: number;
  deleted: number;
  joined: number;
  attended: number;
  finished: number;
};

export type CrewMemberStats = {
  email: string;
  name: string | null;
  userId: string | null;
  today: DayCounts;
  days: DayCounts[];
};

export type CrewStatsPayload = {
  days: number;
  timezone: string;
  todayKey: string;
  members: CrewMemberStats[];
};

export type MetricKey = Exclude<keyof DayCounts, "date">;

export const CREW_METRICS: { key: MetricKey; label: string }[] = [
  { key: "created", label: "Created" },
  { key: "deleted", label: "Deleted" },
  { key: "joined", label: "Joined" },
  { key: "attended", label: "Attended" },
  { key: "finished", label: "Finished" },
];

export const CREW_RANGE_OPTIONS = [7, 14, 30] as const;

export const CREW_DAYS_PAGE_SIZE = 7;

export function dayHasAnyActivity(day: DayCounts): boolean {
  return (
    day.created > 0 ||
    day.deleted > 0 ||
    day.joined > 0 ||
    day.attended > 0 ||
    day.finished > 0
  );
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
