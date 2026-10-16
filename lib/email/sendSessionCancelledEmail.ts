import { sendEmail } from "@/lib/providers/email";
import { buildSessionCancelledEmail } from "@/lib/email/sessionReminderTemplates";

export async function sendSessionCancelledEmail(input: {
  email: string;
  firstName?: string | null;
  fromName: string;
  fromEmail?: string | null;
  message?: string | null;
  sessionTitle: string;
  startsAtLabel: string;
  calendarUrl: string;
  kind: "delete" | "leave";
  teamNote?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const { subject, html, text } = buildSessionCancelledEmail({
    firstName: input.firstName,
    fromName: input.fromName,
    message: input.message,
    sessionTitle: input.sessionTitle,
    startsAtLabel: input.startsAtLabel,
    calendarUrl: input.calendarUrl,
    kind: input.kind,
    teamNote: input.teamNote,
  });

  return sendEmail({ to: input.email, subject, html, text, replyTo: input.fromEmail }, "cancel note");
}
