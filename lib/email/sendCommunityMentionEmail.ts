import { sendEmail } from "@/lib/providers/email";
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
  const { subject, html, text } = buildCommunityMentionEmail(input);
  return sendEmail({ to: input.email, subject, html, text }, "community mention email");
}
