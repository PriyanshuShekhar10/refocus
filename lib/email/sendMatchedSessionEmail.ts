import { getResend, getResendFromEmail, isResendConfigured } from "@/lib/resend";
import { buildMatchedSessionEmail } from "@/lib/email/sessionReminderTemplates";

export async function sendMatchedSessionEmail(input: {
  email: string;
  firstName?: string | null;
  partnerLabel: string | null;
  sessionTitle: string;
  startsAtLabel: string;
  joinUrl: string;
  isFirstMatch: boolean;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isResendConfigured()) {
    console.warn("[email] RESEND_API_KEY not set; skipping match email");
    return { sent: false, reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) return { sent: false, reason: "not_configured" };

  const { subject, html, text } = buildMatchedSessionEmail({
    firstName: input.firstName,
    partnerLabel: input.partnerLabel,
    sessionTitle: input.sessionTitle,
    startsAtLabel: input.startsAtLabel,
    joinUrl: input.joinUrl,
    isFirstMatch: input.isFirstMatch,
  });

  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.email,
    subject,
    html,
    text,
  });

  if (error) {
    console.error(`[email] Resend match email error for ${input.email}:`, error);
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true };
}
