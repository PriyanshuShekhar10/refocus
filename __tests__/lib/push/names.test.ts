import { describe, expect, it } from "vitest";
import {
  formatPushName,
  formatPushStartTime,
  truncatePushBody,
} from "@/lib/push/names";
import { channelForType, QUIET_DURING_CALL } from "@/lib/push/types";
import { joinReminderWindow } from "@/lib/push/joinReminders";

describe("push names", () => {
  it("abbreviates last names", () => {
    expect(
      formatPushName({ firstname: "Priyanshu", lastname: "Sharma" }),
    ).toBe("Priyanshu S.");
  });

  it("falls back to full name then username", () => {
    expect(formatPushName({ name: "Maya Chen" })).toBe("Maya C.");
    expect(formatPushName({ username: "maya" })).toBe("maya");
    expect(formatPushName(null)).toBe("Someone");
  });

  it("truncates long bodies", () => {
    const long = "a".repeat(200);
    expect(truncatePushBody(long, 40).endsWith("…")).toBe(true);
    expect(truncatePushBody(long, 40).length).toBeLessThanOrEqual(40);
  });

  it("formats start times", () => {
    const label = formatPushStartTime("2026-05-26T10:30:00.000Z", "UTC");
    expect(label).toMatch(/10:30|May|Tue|26/i);
  });
});

describe("push types", () => {
  it("maps channels", () => {
    expect(channelForType("chat_message")).toBe("messages");
    expect(channelForType("friend_request")).toBe("messages");
    expect(channelForType("session_reminder")).toBe("sessions");
    expect(channelForType("partner_joined")).toBe("sessions");
  });

  it("marks quiet-during-call types", () => {
    expect(QUIET_DURING_CALL.has("chat_message")).toBe(true);
    expect(QUIET_DURING_CALL.has("session_reminder")).toBe(false);
  });
});

describe("joinReminderWindow", () => {
  it("looks 8–12 minutes ahead", () => {
    const now = new Date("2026-05-26T10:00:00.000Z");
    const { from, to } = joinReminderWindow(now);
    expect(from.getTime()).toBe(now.getTime() + 8 * 60 * 1000);
    expect(to.getTime()).toBe(now.getTime() + 12 * 60 * 1000);
  });
});
