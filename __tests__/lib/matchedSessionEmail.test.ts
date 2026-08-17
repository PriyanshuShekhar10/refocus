import { describe, expect, it } from "vitest";
import { buildMatchedSessionEmail } from "@/lib/email/sessionReminderTemplates";

const base = {
  firstName: "Priya",
  partnerLabel: "Alex",
  sessionTitle: "focus · 50 min",
  startsAtLabel: "Tue, Aug 18, 03:30 PM",
  joinUrl: "https://refocus.co.in/sessions/abc",
  isFirstMatch: false,
};

describe("buildMatchedSessionEmail", () => {
  it("tells the host that someone joined their calendar session", () => {
    const email = buildMatchedSessionEmail({ ...base, isHost: true });
    expect(email.subject).toBe("Alex joined your session");
    expect(email.text).toContain("just joined the session on your calendar");
    expect(email.html).toContain("Session booked");
  });

  it("keeps match copy for the person who joined", () => {
    const email = buildMatchedSessionEmail({ ...base, isHost: false });
    expect(email.subject).toBe("You're matched with Alex");
    expect(email.html).toContain("You're matched");
  });
});
