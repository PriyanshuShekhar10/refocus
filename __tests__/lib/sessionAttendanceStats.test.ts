import { describe, expect, it } from "vitest";
import { accumulateAttendanceStats, toPublicAttendance, formatPublicAttendance, toPublicAttendanceFromRates } from "@/lib/sessionAttendanceStats";
import { sessionParticipantIdValues, readStoredPublicAttendance, PUBLIC_ATTENDANCE_TTL_MS } from "@/lib/sessionAttendanceQuery";
import { attendanceOf } from "@/app/(product)/sessions/PastSessionsList";

const USER = "user-a";
const OTHER = "user-b";

describe("accumulateAttendanceStats", () => {
  it("counts matched no-join as missed, not solo no-join", () => {
    const stats = accumulateAttendanceStats(
      [
        {
          participantCount: 2,
          ownerId: USER,
          didAttend: false,
          didComplete: false,
        },
        {
          participantCount: 1,
          ownerId: USER,
          didAttend: false,
          didComplete: false,
        },
        {
          participantCount: 1,
          ownerId: USER,
          didAttend: false,
          didComplete: false,
        },
        {
          participantCount: 2,
          ownerId: OTHER,
          didAttend: true,
          didComplete: true,
          durationMin: 50,
        },
      ],
      USER,
    );

    expect(stats.solo).toBe(2);
    expect(stats.withPartner).toBe(2);
    expect(stats.booked).toBe(2);
    expect(stats.attended).toBe(1);
    expect(stats.missed).toBe(1);
    expect(stats.attendanceRate).toBe(0.5);
    expect(stats.asOwner).toBe(3);
  });

  it("does not treat all-solo history as missed", () => {
    const stats = accumulateAttendanceStats(
      [
        {
          participantCount: 1,
          ownerId: USER,
          didAttend: false,
          didComplete: false,
        },
        {
          participantCount: 1,
          ownerId: USER,
          didAttend: false,
          didComplete: false,
        },
      ],
      USER,
    );

    expect(stats.solo).toBe(2);
    expect(stats.booked).toBe(0);
    expect(stats.attended).toBe(0);
    expect(stats.missed).toBe(0);
    expect(stats.attendanceRate).toBe(0);
  });
});

describe("toPublicAttendance", () => {
  it("hides percent when there are no partner sessions", () => {
    expect(
      toPublicAttendance(
        accumulateAttendanceStats(
          [
            {
              participantCount: 1,
              ownerId: USER,
              didAttend: false,
              didComplete: false,
            },
          ],
          USER,
        ),
      ),
    ).toBeNull();
  });

  it("rounds partner attendance to a percent", () => {
    expect(
      toPublicAttendance(
        accumulateAttendanceStats(
          [
            {
              participantCount: 2,
              ownerId: USER,
              didAttend: true,
              didComplete: true,
            },
            {
              participantCount: 2,
              ownerId: USER,
              didAttend: true,
              didComplete: true,
            },
            {
              participantCount: 2,
              ownerId: USER,
              didAttend: false,
              didComplete: false,
            },
          ],
          USER,
        ),
      ),
    ).toEqual({ percent: 67, booked: 3, attended: 2 });
    expect(
      formatPublicAttendance({ percent: 80, booked: 25, attended: 20 }),
    ).toBe("80% attendance, 20 sessions attended");
    expect(
      formatPublicAttendance({ percent: 100, booked: 1, attended: 1 }),
    ).toBe("100% attendance, 1 session attended");
  });

  it("builds public attendance from booked/attended rates", () => {
    expect(
      toPublicAttendanceFromRates({
        booked: 10,
        attended: 8,
        attendanceRate: 0.8,
      }),
    ).toEqual({ percent: 80, booked: 10, attended: 8 });
    expect(
      toPublicAttendanceFromRates({
        booked: 0,
        attended: 0,
        attendanceRate: 0,
      }),
    ).toBeNull();
  });
});

describe("sessionParticipantIdValues", () => {
  it("adds an ObjectId twin for canonical hex ids", () => {
    const hex = "64b0a1c2d3e4f56789abcdef";
    const values = sessionParticipantIdValues(hex);
    expect(values[0]).toBe(hex);
    expect(values).toHaveLength(2);
    expect(String(values[1])).toBe(hex);
  });

  it("keeps non-hex ids as strings only", () => {
    expect(sessionParticipantIdValues("user-a")).toEqual(["user-a"]);
  });
});

describe("readStoredPublicAttendance", () => {
  it("treats a recent stored snapshot as fresh", () => {
    const stored = readStoredPublicAttendance({
      publicAttendance: { percent: 90, booked: 10, attended: 9 },
      publicAttendanceAt: new Date(),
    });
    expect(stored.fresh).toBe(true);
    expect(stored.attendance).toEqual({ percent: 90, booked: 10, attended: 9 });
  });

  it("treats an old snapshot as stale but still readable", () => {
    const stored = readStoredPublicAttendance({
      publicAttendance: { percent: 40, booked: 5, attended: 2 },
      publicAttendanceAt: new Date(Date.now() - PUBLIC_ATTENDANCE_TTL_MS - 1000),
    });
    expect(stored.fresh).toBe(false);
    expect(stored.computedAt).not.toBeNull();
    expect(stored.attendance).toEqual({ percent: 40, booked: 5, attended: 2 });
  });
});

describe("attendanceOf", () => {
  it("labels solo without join as unmatched, not missed", () => {
    expect(attendanceOf({ userId: USER, attended: false }, true)).toBe(
      "unmatched",
    );
    expect(attendanceOf({ userId: USER, attended: false }, false)).toBe(
      "missed",
    );
    expect(
      attendanceOf({ userId: USER, attended: true, completed: true }, false),
    ).toBe("completed");
  });
});
