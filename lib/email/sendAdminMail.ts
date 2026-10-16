import { sendEmail } from "@/lib/providers/email";
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
  const { subject, html, text } = buildAdminUserEmail(input);
  return sendEmail({ to: input.email, subject, html, text, replyTo: OPS_NOTIFY_EMAIL }, "admin mail");
}
