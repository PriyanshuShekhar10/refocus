import { getResend, getResendFromEmail, isResendConfigured } from "@/lib/resend";
import {
  buildMorningSessionDigestEmail,
  buildTimedSessionReminderEmail,
} from "@/lib/email/sessionReminderTemplates";
import type { SessionReminderItem } from "@/lib/sessionReminders";

function logResendFailure(email: string, context: string, error: unknown) {
  console.error(`[email] Resend ${context} error for ${email}:`, error);
}

export async function sendMorningSessionDigestEmail(input: {
  email: string;
  firstName?: string | null;
  dayKey: string;
  sessions: SessionReminderItem[];
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isResendConfigured()) {
    console.warn("[email] RESEND_API_KEY not set; skipping morning session digest");
    return { sent: false, reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) return { sent: false, reason: "not_configured" };

  const { subject, html, text } = buildMorningSessionDigestEmail({
    firstName: input.firstName,
    dayKey: input.dayKey,
    sessions: input.sessions,
  });

  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.email,
    subject,
    html,
    text,
  });

  if (error) {
    logResendFailure(input.email, "morning digest", error);
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true };
}

export async function sendTimedSessionReminderEmail(input: {
  email: string;
  firstName?: string | null;
  timing: "1h" | "10m";
  session: SessionReminderItem;
  startsAtLabel: string;
  joinNote: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isResendConfigured()) {
    console.warn("[email] RESEND_API_KEY not set; skipping session reminder");
    return { sent: false, reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) return { sent: false, reason: "not_configured" };

  const { subject, html, text } = buildTimedSessionReminderEmail({
    firstName: input.firstName,
    timing: input.timing,
    session: input.session,
    startsAtLabel: input.startsAtLabel,
    joinNote: input.joinNote,
  });

  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.email,
    subject,
    html,
    text,
  });

  if (error) {
    logResendFailure(input.email, `${input.timing} reminder`, error);
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true };
}
