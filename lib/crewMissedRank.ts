import { getDb } from "@/lib/mongodb";
import { resolveEngagementCrewMembers } from "@/lib/engagementCrew";

export type CrewMissedRankRow = {
  rank: number;
  email: string;
  name: string | null;
  userId: string | null;
  /** Past sessions as a participant with no call_joined_at */
  bookedNeverJoined: number;
  /** Never joined, but session had a partner */
  matched: number;
  /** Never joined, solo / unmatched */
  unmatched: number;
  /** Past sessions where they joined the call */
  attended: number;
  /** Past sessions they completed */
  completed: number;
  /** All past sessions they were booked into */
  pastBooked: number;
  /** bookedNeverJoined / pastBooked * 100 */
  missRatePct: number;
};

export type CrewMissedRankResult = {
  generatedAt: string;
  members: CrewMissedRankRow[];
};

/**
 * All-time crew ranking by past sessions booked (participant) but never
 * joined the call (`call_joined_at` missing). Ended sessions only.
 */
export async function getCrewMissedRank(): Promise<CrewMissedRankResult> {
  const db = await getDb();
  const crew = await resolveEngagementCrewMembers({ writeBack: false });
  const now = new Date();

  const userIds = crew
    .map((m) => m.userId)
    .filter((id): id is string => Boolean(id));

  const countsByUser = new Map<
    string,
    {
      pastBooked: number;
      attended: number;
      completed: number;
      bookedNeverJoined: number;
      matched: number;
      unmatched: number;
    }
  >();

  for (const id of userIds) {
    countsByUser.set(id, {
      pastBooked: 0,
      attended: 0,
      completed: 0,
      bookedNeverJoined: 0,
      matched: 0,
      unmatched: 0,
    });
  }

  if (userIds.length > 0) {
    const userIdSet = new Set(userIds);
    const sessions = await db
      .collection("sessions")
      .find(
        {
          end_time: { $lt: now },
          "session_participants.user_id": { $in: userIds },
        },
        {
          projection: {
            session_participants: 1,
          },
        },
      )
      .toArray();

    for (const doc of sessions) {
      const participants = (doc.session_participants ?? []) as Array<{
        user_id?: string;
        call_joined_at?: Date | string | null;
        call_completed?: boolean;
      }>;
      const matched = participants.length >= 2;

      for (const p of participants) {
        const uid = p.user_id ? String(p.user_id) : "";
        if (!userIdSet.has(uid)) continue;
        const row = countsByUser.get(uid);
        if (!row) continue;

        row.pastBooked += 1;
        if (p.call_joined_at) {
          row.attended += 1;
          if (p.call_completed) row.completed += 1;
        } else {
          row.bookedNeverJoined += 1;
          if (matched) row.matched += 1;
          else row.unmatched += 1;
        }
      }
    }
  }

  const unsorted = crew.map((m) => {
    const c = m.userId ? countsByUser.get(m.userId) : null;
    const pastBooked = c?.pastBooked ?? 0;
    const bookedNeverJoined = c?.bookedNeverJoined ?? 0;
    return {
      email: m.email,
      name: m.name,
      userId: m.userId,
      bookedNeverJoined,
      matched: c?.matched ?? 0,
      unmatched: c?.unmatched ?? 0,
      attended: c?.attended ?? 0,
      completed: c?.completed ?? 0,
      pastBooked,
      missRatePct:
        pastBooked > 0
          ? Math.round((bookedNeverJoined / pastBooked) * 1000) / 10
          : 0,
    };
  });

  unsorted.sort((a, b) => {
    if (b.bookedNeverJoined !== a.bookedNeverJoined) {
      return b.bookedNeverJoined - a.bookedNeverJoined;
    }
    if (b.missRatePct !== a.missRatePct) {
      return b.missRatePct - a.missRatePct;
    }
    return (a.name || a.email).localeCompare(b.name || b.email);
  });

  const members: CrewMissedRankRow[] = unsorted.map((row, i) => ({
    ...row,
    rank: i + 1,
  }));

  return {
    generatedAt: new Date().toISOString(),
    members,
  };
}
