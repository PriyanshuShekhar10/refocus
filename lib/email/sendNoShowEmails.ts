import { getResend, getResendFromEmail, isResendConfigured } from "@/lib/resend";
import {
  buildNoShowDayCancelledEmail,
  buildPartnerRemovedForInactivityEmail,
  type NoShowCancelledSessionItem,
} from "@/lib/email/sessionReminderTemplates";

function logResendFailure(label: string, email: string, error: unknown) {
  const msg =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);

  if (msg.includes("only send testing emails to your own email")) {
    console.warn(
      `[email] Resend sandbox: cannot send ${label} to ${email}. ` +
        "On a free/test API key, Resend only delivers to the email on your Resend account.",
    );
  } else {
    console.error(`[email] Resend ${label} error for ${email}:`, error);
  }
}

export async function sendNoShowDayCancelledEmail(input: {
  email: string;
  firstName?: string | null;
  missedSessionTitle: string;
  missedStartsAtLabel: string;
  cancelledSessions: NoShowCancelledSessionItem[];
  calendarUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isResendConfigured()) {
    console.warn("[email] RESEND_API_KEY not set; skipping no-show day email");
    return { sent: false, reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) return { sent: false, reason: "not_configured" };

  const { subject, html, text } = buildNoShowDayCancelledEmail(input);
  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.email,
    subject,
    html,
    text,
  });

  if (error) {
    logResendFailure("no-show day", input.email, error);
    return { sent: false, reason: "send_failed" };
  }
  return { sent: true };
}

export async function sendPartnerRemovedForInactivityEmail(input: {
  email: string;
  firstName?: string | null;
  removedName: string;
  sessionTitle: string;
  startsAtLabel: string;
  calendarUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isResendConfigured()) {
    console.warn(
      "[email] RESEND_API_KEY not set; skipping partner inactivity email",
    );
    return { sent: false, reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) return { sent: false, reason: "not_configured" };

  const { subject, html, text } = buildPartnerRemovedForInactivityEmail(input);
  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.email,
    subject,
    html,
    text,
  });

  if (error) {
    logResendFailure("partner inactivity", input.email, error);
    return { sent: false, reason: "send_failed" };
  }
  return { sent: true };
}
