import {
  bulkLoadReminderRecipients,
  findSessionsStartingInRange,
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
  const dedupeKey = dayKey;

  // 1. Find active sessions starting today
  const sessions = await findSessionsStartingInRange(start, end, now);
  if (sessions.length === 0) return result;

  // 2. Extract unique participant IDs
  const userIds = new Set<string>();
  for (const s of sessions) {
    if (s.owner_id) userIds.add(String(s.owner_id));
    for (const p of s.session_participants ?? []) {
      userIds.add(String(p.user_id));
    }
  }

  // 3. Bulk load user preferences
  const recipientsMap = await bulkLoadReminderRecipients(Array.from(userIds));

  // 4. Group sessions by user, filtering for morning timing
  const userSessions = new Map<string, typeof sessions>();
  for (const recipient of recipientsMap.values()) {
    if (recipient.timing !== "morning") continue;
    const mySessions = sessions.filter(s => 
      String(s.owner_id) === recipient.userId || 
      (s.session_participants ?? []).some(p => String(p.user_id) === recipient.userId)
    );
    if (mySessions.length > 0) {
      userSessions.set(recipient.userId, mySessions);
    }
  }

  result.recipients = userSessions.size;

  // 5. Send digest emails
  for (const [userId, mySessions] of userSessions.entries()) {
    const recipient = recipientsMap.get(userId)!;

    const marked = await markReminderSent({
      userId: recipient.userId,
      kind: "morning",
      dedupeKey,
    });
    if (!marked) {
      result.skipped += 1;
      continue;
    }

    const items = await toReminderItems(mySessions, recipient.userId);
    const sendResult = await sendMorningSessionDigestEmail({
      email: recipient.email,
      firstName: recipient.firstName,
      dayKey,
      sessions: items,
      timeZone: recipient.timezone,
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

  // 1. Find sessions starting in this target window
  const sessions = await findSessionsStartingInRange(from, to, now);
  if (sessions.length === 0) return result;

  // 2. Extract unique participant IDs
  const userIds = new Set<string>();
  for (const s of sessions) {
    if (s.owner_id) userIds.add(String(s.owner_id));
    for (const p of s.session_participants ?? []) {
      userIds.add(String(p.user_id));
    }
  }

  // 3. Bulk load user preferences
  const recipientsMap = await bulkLoadReminderRecipients(Array.from(userIds));

  // 4. Group sessions by user, filtering for specific timing
  const userSessions = new Map<string, typeof sessions>();
  for (const recipient of recipientsMap.values()) {
    if (recipient.timing !== timing) continue;
    const mySessions = sessions.filter(s => 
      String(s.owner_id) === recipient.userId || 
      (s.session_participants ?? []).some(p => String(p.user_id) === recipient.userId)
    );
    if (mySessions.length > 0) {
      userSessions.set(recipient.userId, mySessions);
    }
  }

  result.recipients = userSessions.size;

  // 5. Send reminder emails
  for (const [userId, mySessions] of userSessions.entries()) {
    const recipient = recipientsMap.get(userId)!;
    const items = await toReminderItems(mySessions, recipient.userId);
    
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
    startsAtLabel: formatSessionTimeIST(
      session.startTime,
      recipient.timezone,
    ),
    joinNote: joinWindowNote(),
  });

  return sendResult.sent ? "sent" : "failed";
}
