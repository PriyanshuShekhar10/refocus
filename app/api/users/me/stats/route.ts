import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { resolveAvatarUrl } from "@/lib/userAvatar";
import { resolveSessionDisplayName } from "@/lib/sessionPersonalization";


type SessionTypeBreakdown = Record<string, number>;
type WeekdayCount = number[]; // length 7, Sunday-first

type AggregatedSession = {
  _id: ObjectId;
  start_time: Date;
  duration_min: number;
  session_type: string;
  name?: string | null;
  owner_id: string;
  participantCount: number;
  me?: {
    user_id?: string;
    label?: string | null;
    call_joined_at?: Date | string;
    call_completed?: boolean;
  };
  partnerId?: string | null;
};

// GET /api/users/me/stats
//
// Aggregates a user's session history into the metrics shown on the profile
// dashboard. Only sessions that have already ended are counted, so the
// numbers don't churn for sessions still in flight.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const now = new Date();

  const sessions = (await db
    .collection("sessions")
    .aggregate([
      {
        $match: {
          end_time: { $lt: now },
          "session_participants.user_id": userId,
        },
      },
      {
        $project: {
          start_time: 1,
          duration_min: 1,
          session_type: 1,
          name: 1,
          owner_id: 1,
          participantCount: { $size: { $ifNull: ["$session_participants", []] } },
          me: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$session_participants",
                  cond: { $eq: ["$$this.user_id", userId] },
                },
              },
              0,
            ],
          },
          partnerId: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: "$session_participants",
                      cond: { $ne: ["$$this.user_id", userId] },
                    }
                  },
                  as: "p",
                  in: "$$p.user_id"
                }
              },
              0,
            ]
          }
        },
      },
      { $sort: { start_time: -1 } },
    ])
    .toArray()) as unknown as AggregatedSession[];

  let booked = 0;
  let attended = 0;
  let completed = 0;
  let totalMinutes = 0;
  let withPartner = 0;
  let solo = 0;
  let asOwner = 0;
  const typeBreakdown: SessionTypeBreakdown = {};
  const byWeekday: WeekdayCount = [0, 0, 0, 0, 0, 0, 0];

  // Build a daily map of completed sessions for the last 8 weeks so the UI
  // can render a sparkline / heatmap without re-querying.
  const trendDays = 56;
  const trendStart = new Date(now);
  trendStart.setHours(0, 0, 0, 0);
  trendStart.setDate(trendStart.getDate() - (trendDays - 1));
  const trend: Array<{ date: string; sessions: number; minutes: number }> = [];
  const trendIndex = new Map<string, number>();
  for (let i = 0; i < trendDays; i++) {
    const d = new Date(trendStart);
    d.setDate(trendStart.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    trendIndex.set(key, i);
    trend.push({ date: key, sessions: 0, minutes: 0 });
  }

  // Sorted by start_time DESC, so iterate as-is.
  const recent: Array<{
    id: string;
    start: string;
    durationMin: number;
    sessionType: string;
    name: string | null;
    attended: boolean;
    completed: boolean;
    solo: boolean;
    partnerId: string | null;
  }> = [];

  // For streaks, collect unique completion days and walk back from today.
  const completedDays = new Set<string>();

  for (const s of sessions) {
    const me = s.me;
    if (!me) continue;

    booked += 1;
    if (s.owner_id === userId) asOwner += 1;

    const hadPartner = s.participantCount >= 2;
    if (hadPartner) withPartner += 1;
    else solo += 1;

    const didAttend = Boolean(me.call_joined_at);
    const didComplete = Boolean(me.call_completed);
    if (didAttend) attended += 1;
    if (didComplete) {
      completed += 1;
      totalMinutes += s.duration_min || 0;

      const startKey = new Date(s.start_time).toISOString().slice(0, 10);
      completedDays.add(startKey);

      const idx = trendIndex.get(startKey);
      if (idx !== undefined) {
        trend[idx].sessions += 1;
        trend[idx].minutes += s.duration_min || 0;
      }

      const weekday = new Date(s.start_time).getDay();
      byWeekday[weekday] += 1;
    }

    typeBreakdown[s.session_type] =
      (typeBreakdown[s.session_type] || 0) + (didComplete ? 1 : 0);

    if (recent.length < 8) {
      recent.push({
        id: String(s._id),
        start: new Date(s.start_time).toISOString(),
        durationMin: s.duration_min,
        sessionType: s.session_type,
        name: resolveSessionDisplayName(
          {
            name: s.name ?? null,
            owner_id: s.owner_id,
            session_participants: s.me
              ? [
                  {
                    user_id: String(s.me.user_id ?? userId),
                    label: s.me.label ?? null,
                  },
                ]
              : [],
          },
          userId,
        ),
        attended: didAttend,
        completed: didComplete,
        solo: !hadPartner,
        partnerId: s.partnerId ? String(s.partnerId) : null,
      });
    }
  }

  const partnerIds = Array.from(
    new Set(recent.map((r) => r.partnerId).filter(Boolean) as string[]),
  ).filter((id) => ObjectId.isValid(id));

  const partnerById: Record<
    string,
    { name: string | null; avatarUrl: string | null }
  > = {};
  if (partnerIds.length > 0) {
    const partners = await db
      .collection("users")
      .find({ _id: { $in: partnerIds.map((id) => new ObjectId(id)) } })
      .project({
        name: 1,
        firstname: 1,
        lastname: 1,
        avatar_url: 1,
        image: 1,
      })
      .toArray();
    for (const u of partners) {
      const id = String(u._id);
      const name =
        [u.firstname, u.lastname].filter(Boolean).join(" ") ||
        (u.name as string | null) ||
        null;
      partnerById[id] = {
        name,
        avatarUrl: resolveAvatarUrl(
          u as { avatar_url?: string | null; image?: string | null },
        ),
      };
    }
  }

  const recentWithPartners = recent.map((r) => {
    const partner = r.partnerId ? partnerById[r.partnerId] : null;
    return {
      id: r.id,
      start: r.start,
      durationMin: r.durationMin,
      sessionType: r.sessionType,
      name: r.name,
      attended: r.attended,
      completed: r.completed,
      solo: r.solo,
      partnerName: partner?.name ?? null,
      partnerAvatarUrl: partner?.avatarUrl ?? null,
    };
  });

  const missed = Math.max(0, booked - attended);
  const attendanceRate = booked > 0 ? attended / booked : 0;
  const completionRate = attended > 0 ? completed / attended : 0;

  // Streaks: consecutive days (counting back from today / yesterday) with
  // at least one completed session.
  const dayKey = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString().slice(0, 10);
  };
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  let currentStreak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  // If no session today, start counting from yesterday (so today not yet
  // counted doesn't break the streak before evening).
  if (!completedDays.has(todayKey) && completedDays.has(yesterdayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (completedDays.has(dayKey(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak: walk all completion days, find longest consecutive run.
  let longestStreak = 0;
  const sortedDays = Array.from(completedDays).sort();
  let runLength = 0;
  let prevDay: string | null = null;
  for (const day of sortedDays) {
    if (prevDay === null) {
      runLength = 1;
    } else {
      const prev = new Date(prevDay);
      const next = new Date(prev);
      next.setDate(prev.getDate() + 1);
      runLength = dayKey(next) === day ? runLength + 1 : 1;
    }
    if (runLength > longestStreak) longestStreak = runLength;
    prevDay = day;
  }

  return NextResponse.json({
    stats: {
      booked,
      attended,
      missed,
      completed,
      attendanceRate,
      completionRate,
      totalMinutes,
      withPartner,
      solo,
      asOwner,
      currentStreak,
      longestStreak,
      typeBreakdown,
      byWeekday,
      trend,
      recent: recentWithPartners,
    },
  });
}
