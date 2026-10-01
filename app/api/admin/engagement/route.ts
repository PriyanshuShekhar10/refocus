import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

type Range = "today" | "7d" | "30d" | "all";
const RANGES: Range[] = ["today", "7d", "30d", "all"];
const DAY = 24 * 60 * 60 * 1000;

type Participant = {
  user_id: string;
  joined_at?: Date | string;
  call_joined_at?: Date | string;
  call_completed?: boolean;
};
type SessionDoc = {
  start_time: Date;
  end_time: Date;
  created_at?: Date;
  session_participants?: Participant[];
};

type Metrics = {
  activeUsers: number;
  matchRate: number | null;
  noShowRate: number | null;
  medianMatchMs: number | null;
  firstDone: number;
  newUsers: number;
  returnRate: number | null;
};

function rangeStart(range: Range, now: Date): Date | null {
  if (range === "all") return null;
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(now.getTime() - (range === "7d" ? 7 : 30) * DAY);
}

const ms = (v: Date | string | undefined) => (v ? new Date(v).getTime() : NaN);

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function compute(
  sessions: SessionDoc[],
  newUserIds: Set<string>,
  from: number,
  to: number,
): Metrics {
  const inRange = sessions.filter((s) => {
    const t = ms(s.start_time);
    return t >= from && t < to;
  });
  const ended = inRange.filter((s) => ms(s.end_time) < to);
  const matched = ended.filter((s) => (s.session_participants?.length ?? 0) >= 2);

  const active = new Set<string>();
  for (const s of sessions) {
    for (const p of s.session_participants ?? []) {
      const j = ms(p.joined_at ?? s.created_at);
      if (j >= from && j < to) active.add(String(p.user_id));
    }
  }

  const noShows = matched.filter((s) =>
    (s.session_participants ?? []).some((p) => !p.call_joined_at),
  ).length;

  const matchTimes: number[] = [];
  for (const s of inRange) {
    const ps = s.session_participants ?? [];
    if (ps.length < 2) continue;
    const created = ms(s.created_at ?? ps[0].joined_at);
    const second = ms(ps[1].joined_at);
    if (Number.isFinite(created) && Number.isFinite(second) && second >= created) {
      matchTimes.push(second - created);
    }
  }

  // Attended sessions per user, across all loaded sessions (for returns + first session).
  const attended = new Map<string, number[]>();
  const completedUsers = new Set<string>();
  for (const s of sessions) {
    for (const p of s.session_participants ?? []) {
      if (!p.call_joined_at) continue;
      const id = String(p.user_id);
      const list = attended.get(id) ?? [];
      list.push(ms(s.start_time));
      attended.set(id, list);
      if (p.call_completed) completedUsers.add(id);
    }
  }

  let returnEligible = 0;
  let returned = 0;
  for (const times of attended.values()) {
    const sorted = times.sort((a, b) => a - b);
    const first = sorted.find((t) => t >= from && t < to && t + 7 * DAY <= Math.max(to, Date.now()));
    if (first === undefined) continue;
    returnEligible += 1;
    if (sorted.some((t) => t > first && t - first <= 7 * DAY)) returned += 1;
  }

  let firstDone = 0;
  for (const id of newUserIds) if (completedUsers.has(id)) firstDone += 1;

  return {
    activeUsers: active.size,
    matchRate: ended.length ? matched.length / ended.length : null,
    noShowRate: matched.length ? noShows / matched.length : null,
    medianMatchMs: median(matchTimes),
    firstDone,
    newUsers: newUserIds.size,
    returnRate: returnEligible ? returned / returnEligible : null,
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const param = new URL(req.url).searchParams.get("range") as Range | null;
  const range: Range = param && RANGES.includes(param) ? param : "7d";
  const now = new Date();
  const start = rangeStart(range, now);
  const span = start ? now.getTime() - start.getTime() : 0;
  const prevStart = start ? new Date(start.getTime() - span) : null;
  // Look back an extra week so 7-day returns and match times have context.
  const loadFrom = prevStart ? new Date(prevStart.getTime() - 7 * DAY) : null;

  const db = await getDb();
  const [sessions, users] = await Promise.all([
    db
      .collection<SessionDoc>("sessions")
      .find(loadFrom ? { start_time: { $gte: loadFrom } } : {})
      .project({
        start_time: 1,
        end_time: 1,
        created_at: 1,
        "session_participants.user_id": 1,
        "session_participants.joined_at": 1,
        "session_participants.call_joined_at": 1,
        "session_participants.call_completed": 1,
      })
      .toArray() as Promise<SessionDoc[]>,
    db
      .collection("users")
      .find(prevStart ? { createdAt: { $gte: prevStart } } : {})
      .project({ _id: 1, createdAt: 1 })
      .toArray(),
  ]);

  const usersIn = (from: number, to: number) =>
    new Set(
      users
        .filter((u) => {
          const t = ms(u.createdAt as Date | undefined);
          return range === "all" ? true : t >= from && t < to;
        })
        .map((u) => String(u._id)),
    );

  const from = start ? start.getTime() : 0;
  const to = now.getTime();
  const current = compute(sessions, usersIn(from, to), from, to);
  const previous = prevStart
    ? compute(sessions, usersIn(prevStart.getTime(), from), prevStart.getTime(), from)
    : null;

  return NextResponse.json({ range, current, previous });
}
