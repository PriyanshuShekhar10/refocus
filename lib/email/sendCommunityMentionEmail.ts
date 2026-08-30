import { getResend, getResendFromEmail, isResendConfigured } from "@/lib/resend";
import {
  buildCommunityMentionEmail,
  type CommunityMentionEmailKind,
} from "@/lib/email/communityMentionTemplates";

export async function sendCommunityMentionEmail(input: {
  email: string;
  firstName?: string | null;
  kind: CommunityMentionEmailKind;
  actorName: string;
  contentPreview: string;
  communityUrl: string;
  settingsUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isResendConfigured()) {
    return { sent: false, reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) return { sent: false, reason: "not_configured" };

  const { subject, html, text } = buildCommunityMentionEmail(input);
  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.email,
    subject,
    html,
    text,
  });

  if (error) {
    console.error(`[email] community mention failed for ${input.email}:`, error);
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true };
}
