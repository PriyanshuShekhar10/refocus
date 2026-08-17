import { describe, expect, it } from "vitest";
import { buildSessionCancelledEmail } from "@/lib/email/sessionReminderTemplates";

const base = {
  firstName: "Alex",
  fromName: "Priya",
  message: "Something came up — sorry!",
  sessionTitle: "focus · 50 min",
  startsAtLabel: "Tue, Aug 18, 03:30 PM",
  calendarUrl: "https://refocus.co.in/sessions",
  kind: "delete" as const,
};

describe("buildSessionCancelledEmail", () => {
  it("says the partner cancelled and quotes the note", () => {
    const email = buildSessionCancelledEmail(base);
    expect(email.subject).toBe("Priya cancelled your session");
    expect(email.text).toContain("Something came up — sorry!");
    expect(email.html).toContain("Session cancelled");
    expect(email.html).not.toContain("<script>");
  });

  it("uses left copy when a participant leaves", () => {
    const email = buildSessionCancelledEmail({ ...base, kind: "leave" });
    expect(email.subject).toBe("Priya left your session");
    expect(email.html).toContain("Session left");
  });

  it("escapes HTML in the note", () => {
    const email = buildSessionCancelledEmail({
      ...base,
      message: '<img src=x onerror=alert(1)>',
    });
    expect(email.html).toContain("&lt;img src=x");
    expect(email.html).not.toContain("<img src=x");
  });
});
