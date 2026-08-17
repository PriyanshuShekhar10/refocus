import { describe, expect, it } from "vitest";
import { buildAdminUserEmail } from "@/lib/email/adminMailTemplates";

describe("buildAdminUserEmail", () => {
  it("personalizes the greeting and keeps the admin subject", () => {
    const email = buildAdminUserEmail({
      firstName: "Alex",
      subject: "Session reminder",
      body: "See you at 5.",
    });
    expect(email.subject).toBe("Session reminder");
    expect(email.text).toContain("Hi Alex,");
    expect(email.text).toContain("See you at 5.");
    expect(email.html).toContain("A note from Refocus");
  });

  it("escapes HTML in the body", () => {
    const email = buildAdminUserEmail({
      firstName: null,
      subject: "Hi <script>",
      body: "<img src=x onerror=alert(1)>",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img");
  });
});
