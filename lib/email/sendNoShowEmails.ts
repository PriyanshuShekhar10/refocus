import { sendEmail } from "@/lib/providers/email";
import {
  buildNoShowDayCancelledEmail,
  buildPartnerRemovedForInactivityEmail,
  type NoShowCancelledSessionItem,
} from "@/lib/email/sessionReminderTemplates";

export async function sendNoShowDayCancelledEmail(input: {
  email: string;
  firstName?: string | null;
  missedSessionTitle: string;
  missedStartsAtLabel: string;
  cancelledSessions: NoShowCancelledSessionItem[];
  calendarUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const { subject, html, text } = buildNoShowDayCancelledEmail(input);
  return sendEmail({ to: input.email, subject, html, text }, "no-show day email");
}

export async function sendPartnerRemovedForInactivityEmail(input: {
  email: string;
  firstName?: string | null;
  removedName: string;
  sessionTitle: string;
  startsAtLabel: string;
  calendarUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const { subject, html, text } = buildPartnerRemovedForInactivityEmail(input);
  return sendEmail({ to: input.email, subject, html, text }, "partner inactivity email");
}
