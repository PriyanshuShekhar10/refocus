import { getResend, getResendFromEmail, isResendConfigured } from "@/lib/resend";
import { buildMatchedSessionEmail } from "@/lib/email/sessionReminderTemplates";

function logResendFailure(email: string, error: unknown) {
  const msg =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);

  if (msg.includes("only send testing emails to your own email")) {
    console.warn(
      `[email] Resend sandbox: cannot send match email to ${email}. ` +
        "On a free/test API key, Resend only delivers to the email on your Resend account.",
    );
  } else {
    console.error(`[email] Resend match email error for ${email}:`, error);
  }
}

export async function sendMatchedSessionEmail(input: {
  email: string;
  firstName?: string | null;
  partnerLabel: string | null;
  sessionTitle: string;
  startsAtLabel: string;
  joinUrl: string;
  isFirstMatch: boolean;
  isHost?: boolean;
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
    isHost: input.isHost,
  });

  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.email,
    subject,
    html,
    text,
  });

  if (error) {
    logResendFailure(input.email, error);
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true };
}
