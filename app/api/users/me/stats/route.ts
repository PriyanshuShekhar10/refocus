import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { resolveAvatarUrl } from "@/lib/userAvatar";
import { resolveSessionDisplayName } from "@/lib/sessionPersonalization";
import { accumulateAttendanceStats } from "@/lib/sessionAttendanceStats";
import { sessionParticipantIdValues } from "@/lib/sessionAttendanceQuery";
import { resolveUserTimeZone } from "@/lib/sessionReminders";
import { ymdInTimeZone, startOfDayInTimeZone, addDaysInTimeZone } from "@/lib/zonedTime";


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
  try {
    return await handleGet();
  } catch (err) {
    console.error("GET /api/users/me/stats failed", err);
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 },
    );
  }
}

async function handleGet() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const now = new Date();
  const participantIdValues = sessionParticipantIdValues(userId);

  const userDoc = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { preferences: 1 } },
    );
  const timeZone = resolveUserTimeZone(
    userDoc?.preferences as { timezone?: string } | undefined,
  );

  const sessions = (await db
    .collection("sessions")
    .aggregate([
      {
        $match: {
          end_time: { $lt: now },
          "session_participants.user_id": { $in: participantIdValues },
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
                  cond: { $in: ["$$this.user_id", participantIdValues] },
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
                      cond: { $not: { $in: ["$$this.user_id", participantIdValues] } },
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
  //
  // Day boundaries are the user's own calendar day (per their timezone
  // preference, resolved above), not the server's — so "today" lines up
  // with the day the user actually experienced.
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const trendDays = 56;
  const trend: Array<{ date: string; sessions: number; minutes: number }> = [];
  const trendIndex = new Map<string, number>();
  let trendCursor = addDaysInTimeZone(now, -(trendDays - 1), timeZone);
  for (let i = 0; i < trendDays; i++) {
    const key = ymdInTimeZone(trendCursor, timeZone);
    trendIndex.set(key, i);
    trend.push({ date: key, sessions: 0, minutes: 0 });
    trendCursor = addDaysInTimeZone(trendCursor, 1, timeZone);
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

  const attendanceInputs = [];

  for (const s of sessions) {
    const me = s.me;
    if (!me) continue;

    const hadPartner = s.participantCount >= 2;
    const didAttend = Boolean(me.call_joined_at);
    const didComplete = Boolean(me.call_completed);

    attendanceInputs.push({
      participantCount: s.participantCount,
      ownerId: String(s.owner_id ?? ""),
      didAttend,
      didComplete,
      durationMin: s.duration_min || 0,
    });

    if (didComplete) {
      completed += 1;
      totalMinutes += s.duration_min || 0;

      const startKey = ymdInTimeZone(new Date(s.start_time), timeZone);
      completedDays.add(startKey);

      const idx = trendIndex.get(startKey);
      if (idx !== undefined) {
        trend[idx].sessions += 1;
        trend[idx].minutes += s.duration_min || 0;
      }

      // Weekday of the user's local calendar day (startKey), not the
      // server's interpretation of the raw UTC timestamp.
      const [y, m, d] = startKey.split("-").map(Number);
      const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
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

  const attendance = accumulateAttendanceStats(attendanceInputs, userId);
  booked = attendance.booked;
  attended = attendance.attended;
  withPartner = attendance.withPartner;
  solo = attendance.solo;
  asOwner = attendance.asOwner;
  const missed = attendance.missed;
  const attendanceRate = attendance.attendanceRate;

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

  const completionRate = attended > 0 ? completed / attended : 0;

  // Streaks: consecutive days (counting back from today / yesterday) with
  // at least one completed session. Day keys are the user's own calendar
  // day (`timeZone`, resolved above), matching how `completedDays` and the
  // trend above are keyed — so streaks track the day as the user
  // experienced it, not the server's.
  const todayKey = ymdInTimeZone(now, timeZone);
  const yesterdayKey = ymdInTimeZone(addDaysInTimeZone(now, -1, timeZone), timeZone);

  let currentStreak = 0;
  let cursor = startOfDayInTimeZone(now, timeZone);
  // If no session today, start counting from yesterday (so today not yet
  // counted doesn't break the streak before evening).
  if (!completedDays.has(todayKey) && completedDays.has(yesterdayKey)) {
    cursor = addDaysInTimeZone(cursor, -1, timeZone);
  }
  while (completedDays.has(ymdInTimeZone(cursor, timeZone))) {
    currentStreak += 1;
    cursor = addDaysInTimeZone(cursor, -1, timeZone);
  }

  // Longest streak: walk all completion days, find longest consecutive run.
  // Each `day` is already a resolved local-calendar-date string, so a plain
  // UTC-parsed diff of exactly one day correctly means "consecutive".
  let longestStreak = 0;
  const sortedDays = Array.from(completedDays).sort();
  let runLength = 0;
  let prevDayMs: number | null = null;
  for (const day of sortedDays) {
    const currentMs = Date.parse(`${day}T00:00:00.000Z`);
    runLength = prevDayMs !== null && currentMs - prevDayMs === ONE_DAY_MS ? runLength + 1 : 1;
    if (runLength > longestStreak) longestStreak = runLength;
    prevDayMs = currentMs;
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
