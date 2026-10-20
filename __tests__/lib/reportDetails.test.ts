import { describe, it, expect } from "vitest";
import { hasEnoughReportDetails, REPORT_DETAILS_MIN_LENGTH } from "@/lib/reportConstants";

describe("hasEnoughReportDetails", () => {
  it("requires a short sentence", () => {
    expect(REPORT_DETAILS_MIN_LENGTH).toBe(10);
    expect(hasEnoughReportDetails(undefined)).toBe(false);
    expect(hasEnoughReportDetails("")).toBe(false);
    expect(hasEnoughReportDetails("   rude    ")).toBe(false);
    expect(hasEnoughReportDetails("was rude!")).toBe(false);
    expect(hasEnoughReportDetails("Was rude to me")).toBe(true);
    expect(hasEnoughReportDetails("  Kept unmuting and shouting  ")).toBe(true);
  });
});
