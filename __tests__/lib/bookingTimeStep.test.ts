import { describe, it, expect } from "vitest";
import {
  BOOKING_TIME_STEP_MINUTES,
  isBookingStartAligned,
  maxAlignedBookingStartMinutes,
} from "@/constants/calendar";

describe("booking time step", () => {
  it("uses a 30-minute least count", () => {
    expect(BOOKING_TIME_STEP_MINUTES).toBe(30);
  });

  it("accepts UTC :00 and :30 instants", () => {
    expect(isBookingStartAligned(new Date("2026-08-24T04:30:00.000Z"))).toBe(
      true,
    ); // 10:00 IST
    expect(isBookingStartAligned(new Date("2026-08-24T05:00:00.000Z"))).toBe(
      true,
    ); // 10:30 IST
  });

  it("rejects quarter-hour and non-zero seconds", () => {
    expect(isBookingStartAligned(new Date("2026-08-24T04:45:00.000Z"))).toBe(
      false,
    );
    expect(isBookingStartAligned(new Date("2026-08-24T05:00:01.000Z"))).toBe(
      false,
    );
  });

  it("keeps end-of-day max starts on the 30-minute grid with overnight overflow", () => {
    // With 60m past-midnight overflow, all durations can start as late as 23:30
    expect(maxAlignedBookingStartMinutes(24 * 60, 50)).toBe(23 * 60 + 30); // 23:30
    expect(maxAlignedBookingStartMinutes(24 * 60, 75)).toBe(23 * 60 + 30); // 23:30
    expect(maxAlignedBookingStartMinutes(24 * 60, 25)).toBe(23 * 60 + 30); // 23:30
  });

  it("without overflow, longer sessions must start earlier", () => {
    expect(maxAlignedBookingStartMinutes(24 * 60, 75, 30, 0)).toBe(22 * 60 + 30);
    expect(maxAlignedBookingStartMinutes(24 * 60, 50, 30, 0)).toBe(23 * 60);
  });
});
