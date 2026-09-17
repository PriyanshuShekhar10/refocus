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
    expect(email.html).toContain("and sent a note");
  });

  it("sends a leave email without a quoted note when none was written", () => {
    const email = buildSessionCancelledEmail({
      ...base,
      kind: "leave",
      message: "",
    });
    expect(email.subject).toBe("Priya left your session");
    expect(email.text).toContain("Priya left the session you had together.");
    expect(email.text).not.toContain("and sent a note");
    expect(email.html).not.toContain("<blockquote");
    expect(email.html).not.toContain("and sent a note");
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
