import { getResend, getResendFromEmail, isResendConfigured } from "@/lib/resend";
import { OPS_NOTIFY_EMAIL } from "@/lib/email/opsNotify";
import { buildAdminUserEmail } from "@/lib/email/adminMailTemplates";

export {
  ADMIN_MAIL_MAX_RECIPIENTS,
  ADMIN_MAIL_SUBJECT_MAX,
  ADMIN_MAIL_BODY_MAX,
} from "@/lib/email/adminMailLimits";

export async function sendAdminUserEmail(input: {
  email: string;
  firstName?: string | null;
  subject: string;
  body: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isResendConfigured()) {
    return { sent: false, reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) return { sent: false, reason: "not_configured" };

  const { subject, html, text } = buildAdminUserEmail(input);
  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.email,
    replyTo: OPS_NOTIFY_EMAIL,
    subject,
    html,
    text,
  });

  if (error) {
    console.error(`[email] admin mail failed for ${input.email}:`, error);
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true };
}
