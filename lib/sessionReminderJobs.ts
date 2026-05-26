import {
  findReminderRecipients,
  findUserSessionsInRange,
  formatSessionTimeIST,
  getISTDayBounds,
  joinWindowNote,
  markReminderSent,
  startWindowForTiming,
  toReminderItems,
  type ReminderRecipient,
  type SessionReminderItem,
  type SessionReminderTiming,
} from "@/lib/sessionReminders";
import {
  sendMorningSessionDigestEmail,
  sendTimedSessionReminderEmail,
} from "@/lib/email/sendSessionReminderEmail";

export type ReminderRunResult = {
  kind: SessionReminderTiming;
  recipients: number;
  sent: number;
  skipped: number;
  failed: number;
};

export async function runMorningSessionReminders(
  now = new Date(),
): Promise<ReminderRunResult> {
  const result: ReminderRunResult = {
    kind: "morning",
    recipients: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  const { start, end, dayKey } = getISTDayBounds(now);
  const recipients = await findReminderRecipients("morning");
  result.recipients = recipients.length;

  for (const recipient of recipients) {
    const sessions = await findUserSessionsInRange(
      recipient.userId,
      start,
      end,
      now,
    );
    if (sessions.length === 0) {
      result.skipped += 1;
      continue;
    }

    const dedupeKey = dayKey;
    const marked = await markReminderSent({
      userId: recipient.userId,
      kind: "morning",
      dedupeKey,
    });
    if (!marked) {
      result.skipped += 1;
      continue;
    }

    const items = await toReminderItems(sessions, recipient.userId);
    const sendResult = await sendMorningSessionDigestEmail({
      email: recipient.email,
      firstName: recipient.firstName,
      dayKey,
      sessions: items,
    });

    if (sendResult.sent) result.sent += 1;
    else result.failed += 1;
  }

  return result;
}

export async function runTimedSessionReminders(
  timing: "1h" | "10m",
  now = new Date(),
): Promise<ReminderRunResult> {
  const result: ReminderRunResult = {
    kind: timing,
    recipients: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  const { from, to } = startWindowForTiming(timing, now);
  const recipients = await findReminderRecipients(timing);
  result.recipients = recipients.length;

  for (const recipient of recipients) {
    const sessions = await findUserSessionsInRange(
      recipient.userId,
      from,
      to,
      now,
    );
    if (sessions.length === 0) continue;

    const items = await toReminderItems(sessions, recipient.userId);
    for (const session of items) {
      const sent = await sendTimedReminderForSession(recipient, session, timing);
      if (sent === "sent") result.sent += 1;
      else if (sent === "skipped") result.skipped += 1;
      else result.failed += 1;
    }
  }

  return result;
}

async function sendTimedReminderForSession(
  recipient: ReminderRecipient,
  session: SessionReminderItem,
  timing: "1h" | "10m",
): Promise<"sent" | "skipped" | "failed"> {
  const dedupeKey = session.id;
  const marked = await markReminderSent({
    userId: recipient.userId,
    kind: timing,
    dedupeKey,
  });
  if (!marked) return "skipped";

  const sendResult = await sendTimedSessionReminderEmail({
    email: recipient.email,
    firstName: recipient.firstName,
    timing,
    session,
    startsAtLabel: formatSessionTimeIST(session.startTime),
    joinNote: joinWindowNote(),
  });

  return sendResult.sent ? "sent" : "failed";
}
