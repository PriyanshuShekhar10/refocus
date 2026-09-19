/**
 * Attendance / missed math for profile stats.
 * Solo (unmatched) sessions cannot be joined and must not inflate missed.
 *
 * Keep this module free of mongodb so client components can import it.
 */

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

export function toPublicAttendanceFromRates(input: {
  booked: number;
  attended: number;
  attendanceRate: number;
}): PublicAttendance | null {
  return toPublicAttendance({
    booked: input.booked,
    attended: input.attended,
    missed: Math.max(0, input.booked - input.attended),
    solo: 0,
    withPartner: input.booked,
    asOwner: 0,
    attendanceRate: input.attendanceRate,
  });
}
