/**
 * Characterisation tests for every user-facing email sender.
 *
 * They pin today's behaviour (recipient, sender, subject, plain-text body and
 * the not-configured / provider-error paths) so the email provider layer
 * refactor (docs/REFACTOR-PLAN.md, Phase 2) can't change what users receive.
 * Snapshots live in __snapshots__/; update them only for intentional copy changes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();
vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send } })),
  getResendFromEmail: vi.fn(() => "Refocus <hello@refocus.co.in>"),
  isResendConfigured: vi.fn(() => true),
}));
vi.mock("@/lib/emailVerification", async (orig) => ({
  ...(await orig<object>()),
  createVerificationToken: vi.fn(() => "verify-token-123"),
  setEmailVerificationToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/passwordReset", async (orig) => ({
  ...(await orig<object>()),
  createPasswordResetToken: vi.fn(() => "reset-token-456"),
  setPasswordResetToken: vi.fn().mockResolvedValue(undefined),
}));

import { isResendConfigured } from "@/lib/resend";
import { sendAdminUserEmail } from "@/lib/email/sendAdminMail";
import { sendCommunityMentionEmail } from "@/lib/email/sendCommunityMentionEmail";
import { sendMatchedSessionEmail } from "@/lib/email/sendMatchedSessionEmail";
import {
  sendNoShowDayCancelledEmail,
  sendPartnerRemovedForInactivityEmail,
} from "@/lib/email/sendNoShowEmails";
import { sendPasswordResetEmail } from "@/lib/email/sendPasswordResetEmail";
import { sendSessionCancelledEmail } from "@/lib/email/sendSessionCancelledEmail";
import {
  sendMorningSessionDigestEmail,
  sendTimedSessionReminderEmail,
} from "@/lib/email/sendSessionReminderEmail";
import { sendWelcomeVerificationEmail } from "@/lib/email/sendWelcomeEmail";

const TO = "member@example.com";
const session = {
  id: "s1",
  startTime: new Date("2026-10-20T04:30:00Z"),
  endTime: new Date("2026-10-20T05:20:00Z"),
  durationMin: 50,
  sessionType: "focus",
  title: "Focus · 50 min",
  partnerLabel: "Asha",
  joinUrl: "https://dashboard.refocus.co.in/sessions/s1",
};

const SENDERS: Array<[string, () => Promise<{ sent: boolean; reason?: string }>]> = [
  ["admin mail", () => sendAdminUserEmail({ email: TO, firstName: "Ravi", subject: "Hello from Refocus", body: "Line one\n\nLine two" })],
  ["community mention", () => sendCommunityMentionEmail({ email: TO, firstName: "Ravi", kind: "mention", actorName: "Asha", contentPreview: "@ravi nice work", communityUrl: "https://dashboard.refocus.co.in/community", settingsUrl: "https://dashboard.refocus.co.in/settings" })],
  ["community thread reply", () => sendCommunityMentionEmail({ email: TO, firstName: "Ravi", kind: "thread_reply", actorName: "Asha", contentPreview: "agreed!", communityUrl: "https://dashboard.refocus.co.in/community", settingsUrl: "https://dashboard.refocus.co.in/settings" })],
  ["matched", () => sendMatchedSessionEmail({ email: TO, firstName: "Ravi", partnerLabel: "Asha", sessionTitle: "Focus · 50 min", startsAtLabel: "Tue, 20 Oct · 10:00 AM IST", joinUrl: session.joinUrl, isFirstMatch: true, isHost: false })],
  ["no-show day cancelled", () => sendNoShowDayCancelledEmail({ email: TO, firstName: "Ravi", missedSessionTitle: "Focus · 50 min", missedStartsAtLabel: "10:00 AM", cancelledSessions: [{ title: "Focus · 50 min", startsAtLabel: "3:00 PM" }], calendarUrl: "https://dashboard.refocus.co.in/dashboard" })],
  ["partner removed for inactivity", () => sendPartnerRemovedForInactivityEmail({ email: TO, firstName: "Ravi", removedName: "Asha", sessionTitle: "Focus · 50 min", startsAtLabel: "3:00 PM", calendarUrl: "https://dashboard.refocus.co.in/dashboard" })],
  ["password reset", () => sendPasswordResetEmail({ userId: "u1", email: TO, firstName: "Ravi" })],
  ["session cancelled (delete)", () => sendSessionCancelledEmail({ email: TO, firstName: "Ravi", fromName: "Asha", message: "Sorry, something came up", sessionTitle: "Focus · 50 min", startsAtLabel: "3:00 PM", calendarUrl: "https://dashboard.refocus.co.in/dashboard", kind: "delete" })],
  ["session cancelled (leave)", () => sendSessionCancelledEmail({ email: TO, firstName: "Ravi", fromName: "Asha", sessionTitle: "Focus · 50 min", startsAtLabel: "3:00 PM", calendarUrl: "https://dashboard.refocus.co.in/dashboard", kind: "leave" })],
  ["morning digest", () => sendMorningSessionDigestEmail({ email: TO, firstName: "Ravi", dayKey: "2026-10-20", sessions: [session], timeZone: "Asia/Kolkata" })],
  ["timed reminder 10m", () => sendTimedSessionReminderEmail({ email: TO, firstName: "Ravi", timing: "10m", session, startsAtLabel: "10:00 AM IST", joinNote: "The room opens 30 min before start." })],
  ["welcome verification", () => sendWelcomeVerificationEmail({ userId: "u1", email: TO, firstName: "Ravi" })],
];

describe("email senders (characterisation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isResendConfigured).mockReturnValue(true);
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    process.env.NEXT_PUBLIC_APP_URL = "https://dashboard.refocus.co.in";
  });

  it.each(SENDERS)("%s: sends one email with today's content", async (_name, run) => {
    const result = await run();
    expect(result.sent).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const msg = send.mock.calls[0][0] as { from: string; to: string; subject: string; html: string; text: string };
    expect(msg.to).toBe(TO);
    expect(msg.from).toBe("Refocus <hello@refocus.co.in>");
    expect(msg.html.length).toBeGreaterThan(100);
    expect({ subject: msg.subject, text: msg.text }).toMatchSnapshot();
  });

  it.each(SENDERS)("%s: skips cleanly when email isn't configured", async (_name, run) => {
    vi.mocked(isResendConfigured).mockReturnValue(false);
    const result = await run();
    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(send).not.toHaveBeenCalled();
  });

  it.each(SENDERS)("%s: reports a provider error without throwing", async (_name, run) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    send.mockResolvedValue({ data: null, error: { message: "boom" } });
    const result = await run();
    expect(result.sent).toBe(false);
  });
});
