import { describe, expect, it } from "vitest";
import {
  buildOpsSessionMatchedEmail,
  buildOpsSignupEmail,
} from "@/lib/email/opsTemplates";
import { OPS_NOTIFY_EMAIL } from "@/lib/email/opsNotify";

describe("OPS_NOTIFY_EMAIL", () => {
  it("is hardcoded to the founder inbox", () => {
    expect(OPS_NOTIFY_EMAIL).toBe("priyanshushekhar100@gmail.com");
  });
});

describe("ops email copy", () => {
  it("summarizes a signup without verification links", () => {
    const email = buildOpsSignupEmail({
      email: "alex@example.com",
      firstName: "Alex",
      method: "google",
      userId: "abc123",
    });
    expect(email.subject).toBe("New signup: Alex (alex@example.com)");
    expect(email.text).toContain("Google");
    expect(email.text).toContain("abc123");
    expect(email.html).not.toContain("verify");
  });

  it("summarizes a booked session", () => {
    const email = buildOpsSessionMatchedEmail({
      sessionTitle: "focus · 50 min",
      startsAtLabel: "Tue, Aug 18, 03:30 PM IST",
      host: { name: "Priya", email: "host@example.com" },
      joiner: { name: "Alex", email: "joiner@example.com" },
      joinUrl: "https://refocus.co.in/sessions/abc",
    });
    expect(email.subject).toContain("Alex");
    expect(email.subject).toContain("Priya");
    expect(email.html).toContain("https://refocus.co.in/sessions/abc");
    expect(email.text).toContain("Host: Priya (host@example.com)");
  });
});
