import { sendEmail } from "@/lib/providers/email";
import {
  buildMorningSessionDigestEmail,
  buildTimedSessionReminderEmail,
} from "@/lib/email/sessionReminderTemplates";
import type { SessionReminderItem } from "@/lib/sessionReminders";

export async function sendMorningSessionDigestEmail(input: {
  email: string;
  firstName?: string | null;
  dayKey: string;
  sessions: SessionReminderItem[];
  timeZone?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const { subject, html, text } = buildMorningSessionDigestEmail({
    firstName: input.firstName,
    dayKey: input.dayKey,
    sessions: input.sessions,
    timeZone: input.timeZone,
  });

  return sendEmail({ to: input.email, subject, html, text }, "morning digest");
}

export async function sendTimedSessionReminderEmail(input: {
  email: string;
  firstName?: string | null;
  timing: "1h" | "10m";
  session: SessionReminderItem;
  startsAtLabel: string;
  joinNote: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const { subject, html, text } = buildTimedSessionReminderEmail({
    firstName: input.firstName,
    timing: input.timing,
    session: input.session,
    startsAtLabel: input.startsAtLabel,
    joinNote: input.joinNote,
  });

  return sendEmail({ to: input.email, subject, html, text }, `${input.timing} reminder`);
}
