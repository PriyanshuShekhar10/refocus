/**
 * Attendance / missed math for profile stats.
 * Solo (unmatched) sessions cannot be joined and must not inflate missed.
 */

import type { Db } from "mongodb";

export type AttendanceSessionInput = {
  participantCount: number;
  ownerId: string;
  didAttend: boolean;
  didComplete: boolean;
  durationMin?: number;
};

export type AttendanceTotals = {
  booked: number;
  attended: number;
  missed: number;
  solo: number;
  withPartner: number;
  asOwner: number;
  attendanceRate: number;
};

export function accumulateAttendanceStats(
  sessions: AttendanceSessionInput[],
  userId: string,
): AttendanceTotals {
  let booked = 0;
  let attended = 0;
  let solo = 0;
  let withPartner = 0;
  let asOwner = 0;

  for (const s of sessions) {
    if (s.ownerId === userId) asOwner += 1;

    const hadPartner = s.participantCount >= 2;
    if (hadPartner) {
      withPartner += 1;
      booked += 1;
      if (s.didAttend) attended += 1;
    } else {
      solo += 1;
    }
  }

  const missed = Math.max(0, booked - attended);
  const attendanceRate = booked > 0 ? attended / booked : 0;

  return {
    booked,
    attended,
    missed,
    solo,
    withPartner,
    asOwner,
    attendanceRate,
  };
}

export type PublicAttendance = {
  percent: number;
  booked: number;
  attended: number;
};

/** Rounded percent for display, or null when there are no partner sessions. */
export function toPublicAttendance(
  totals: AttendanceTotals,
): PublicAttendance | null {
  if (totals.booked <= 0) return null;
  return {
    percent: Math.round(totals.attendanceRate * 100),
    booked: totals.booked,
    attended: totals.attended,
  };
}

export function formatPublicAttendance(attendance: PublicAttendance): string {
  const noun = attendance.attended === 1 ? "session" : "sessions";
  return `${attendance.percent}% attendance, ${attendance.attended} ${noun} attended`;
}

type SessionAttendanceDoc = {
  owner_id?: unknown;
  session_participants?: Array<{
    user_id?: unknown;
    call_joined_at?: Date | string | null;
    call_completed?: boolean | null;
  }>;
};

export async function getAttendanceTotalsForUser(
  db: Db,
  userId: string,
  now = new Date(),
): Promise<AttendanceTotals> {
  const docs = (await db
    .collection("sessions")
    .find({
      end_time: { $lt: now },
      "session_participants.user_id": userId,
    })
    .project({ owner_id: 1, session_participants: 1 })
    .toArray()) as SessionAttendanceDoc[];

  const inputs: AttendanceSessionInput[] = docs.map((doc) => {
    const participants = doc.session_participants ?? [];
    const me = participants.find((p) => String(p.user_id) === String(userId));
    return {
      participantCount: participants.length,
      ownerId: String(doc.owner_id ?? ""),
      didAttend: Boolean(me?.call_joined_at),
      didComplete: Boolean(me?.call_completed),
    };
  });

  return accumulateAttendanceStats(inputs, String(userId));
}
