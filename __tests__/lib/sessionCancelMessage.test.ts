import { describe, expect, it } from "vitest";
import { normalizeCancelMessage } from "@/lib/sessionCancelMessage";

describe("normalizeCancelMessage", () => {
  it("returns null for empty or non-string input", () => {
    expect(normalizeCancelMessage("")).toBeNull();
    expect(normalizeCancelMessage("   ")).toBeNull();
    expect(normalizeCancelMessage(null)).toBeNull();
    expect(normalizeCancelMessage(12)).toBeNull();
  });

  it("trims and keeps a short note", () => {
    expect(normalizeCancelMessage("  Sorry, running late  ")).toBe(
      "Sorry, running late",
    );
  });

  it("caps length at 500 characters", () => {
    const note = "a".repeat(600);
    expect(normalizeCancelMessage(note)?.length).toBe(500);
  });
});
