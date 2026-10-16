import { sendEmail } from "@/lib/providers/email";
import { buildMatchedSessionEmail } from "@/lib/email/sessionReminderTemplates";

export async function sendMatchedSessionEmail(input: {
  email: string;
  firstName?: string | null;
  partnerLabel: string | null;
  sessionTitle: string;
  startsAtLabel: string;
  joinUrl: string;
  isFirstMatch: boolean;
  isHost?: boolean;
  teamNote?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const { subject, html, text } = buildMatchedSessionEmail({
    firstName: input.firstName,
    partnerLabel: input.partnerLabel,
    sessionTitle: input.sessionTitle,
    startsAtLabel: input.startsAtLabel,
    joinUrl: input.joinUrl,
    isFirstMatch: input.isFirstMatch,
    isHost: input.isHost,
    teamNote: input.teamNote,
  });

  return sendEmail({ to: input.email, subject, html, text }, "match email");
}
