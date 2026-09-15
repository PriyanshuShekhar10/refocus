import { describe, expect, it } from "vitest";
import { accumulateAttendanceStats } from "@/lib/sessionAttendanceStats";
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
