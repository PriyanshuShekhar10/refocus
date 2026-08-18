import { describe, expect, it } from "vitest";
import { buildTimedSessionReminderEmail } from "@/lib/email/sessionReminderTemplates";

const session = {
  id: "abc",
  startTime: new Date("2026-08-18T10:00:00.000Z"),
  endTime: new Date("2026-08-18T10:50:00.000Z"),
  durationMin: 50,
  sessionType: "focus",
  title: "focus · 50 min",
  partnerLabel: "Alex",
  joinUrl: "https://refocus.co.in/sessions/abc",
};

describe("buildTimedSessionReminderEmail", () => {
  it("uses the 1-hour don't-leave-them-hanging copy", () => {
    const email = buildTimedSessionReminderEmail({
      firstName: "Priya",
      timing: "1h",
      session,
      startsAtLabel: "Tue, Aug 18, 03:30 PM",
      joinNote: "You can join the live call from 10 minutes before the session starts.",
    });

    expect(email.subject).toBe(
      "Your session is in 1 hour — don't leave your partner hanging",
    );
    expect(email.text).toContain(
      "Your scheduled session is in 1 hour. Do not leave your partner hanging!",
    );
    expect(email.text).toContain("Have a productive session.");
    expect(email.html).toContain("Don't be late");
    expect(email.html).toContain("Have a productive session.");
  });

  it("keeps 10-minute starting-soon copy", () => {
    const email = buildTimedSessionReminderEmail({
      firstName: "Priya",
      timing: "10m",
      session,
      startsAtLabel: "Tue, Aug 18, 03:30 PM",
      joinNote: "You can join the live call from 10 minutes before the session starts.",
    });

    expect(email.subject).toBe("Starting soon: focus · 50 min");
    expect(email.text).toContain("about 10 minutes");
    expect(email.text).not.toContain("Do not leave your partner hanging");
  });
});
