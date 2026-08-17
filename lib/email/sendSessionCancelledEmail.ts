import { getResend, getResendFromEmail, isResendConfigured } from "@/lib/resend";
import { buildSessionCancelledEmail } from "@/lib/email/sessionReminderTemplates";

function logResendFailure(email: string, error: unknown) {
  const msg =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);

  if (msg.includes("only send testing emails to your own email")) {
    console.warn(
      `[email] Resend sandbox: cannot send cancel note to ${email}. ` +
        "On a free/test API key, Resend only delivers to the email on your Resend account.",
    );
  } else {
    console.error(`[email] Resend cancel note error for ${email}:`, error);
  }
}

export async function sendSessionCancelledEmail(input: {
  email: string;
  firstName?: string | null;
  fromName: string;
  fromEmail?: string | null;
  message: string;
  sessionTitle: string;
  startsAtLabel: string;
  calendarUrl: string;
  kind: "delete" | "leave";
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isResendConfigured()) {
    console.warn("[email] RESEND_API_KEY not set; skipping cancel note");
    return { sent: false, reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) return { sent: false, reason: "not_configured" };

  const { subject, html, text } = buildSessionCancelledEmail({
    firstName: input.firstName,
    fromName: input.fromName,
    message: input.message,
    sessionTitle: input.sessionTitle,
    startsAtLabel: input.startsAtLabel,
    calendarUrl: input.calendarUrl,
    kind: input.kind,
  });

  const replyTo = input.fromEmail?.trim() || undefined;
  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.email,
    ...(replyTo ? { replyTo } : {}),
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
