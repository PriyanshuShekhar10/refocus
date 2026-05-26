import { ObjectId } from "mongodb";
import { TIME_CONFIG } from "@/constants/calendar";
import { getDb } from "@/lib/mongodb";
import { getSiteUrl } from "@/lib/site";
import { CALL_JOIN_GRACE_MINUTES } from "@/lib/sessionWindow";
import {
  DEFAULT_SESSION_REMINDER_TIMING,
  SESSION_REMINDER_TIMINGS,
  type SessionReminderTiming,
} from "@/lib/sessionReminderPrefs";
export type { SessionReminderTiming } from "@/lib/sessionReminderPrefs";

/** IST hour (0–23) when the morning digest is sent. */
export const MORNING_DIGEST_HOUR_IST = 7;

type SessionDoc = {
  _id: ObjectId;
  owner_id: string;
  start_time: Date;
  end_time: Date;
  duration_min: number;
  session_type: string;
  name?: string | null;
  session_participants?: Array<{ user_id: string }>;
};

type UserDoc = {
  _id: ObjectId;
  email?: string | null;
  firstname?: string | null;
  name?: string | null;
  preferences?: {
    emailSessionReminders?: boolean;
    sessionReminderTiming?: SessionReminderTiming;
  };
};

export type SessionReminderItem = {
  id: string;
  startTime: Date;
  endTime: Date;
  durationMin: number;
  sessionType: string;
  title: string;
  partnerLabel: string | null;
  joinUrl: string;
};

export type ReminderRecipient = {
  userId: string;
  email: string;
  firstName: string | null;
  timing: SessionReminderTiming;
};

function istDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: TIME_CONFIG.timezone });
}

export function getISTDayBounds(date: Date): { start: Date; end: Date; dayKey: string } {
  const dayKey = istDateKey(date);
  const start = new Date(`${dayKey}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, dayKey };
}

export function formatSessionTimeIST(date: Date): string {
  return date.toLocaleString(TIME_CONFIG.locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_CONFIG.timezone,
  });
}

export function sessionJoinUrl(sessionId: string): string {
  return `${getSiteUrl()}/sessions/${sessionId}`;
}

export function resolveReminderTiming(
  prefs: UserDoc["preferences"],
): SessionReminderTiming | null {
  if (prefs?.emailSessionReminders === false) return null;
  const timing = prefs?.sessionReminderTiming;
  if (timing && SESSION_REMINDER_TIMINGS.includes(timing)) return timing;
  return DEFAULT_SESSION_REMINDER_TIMING;
}

export function startWindowForTiming(
  timing: "1h" | "10m",
  now: Date,
): { from: Date; to: Date } {
  const offsetMinutes = timing === "1h" ? 60 : 10;
  const halfWindowMs = 3 * 60 * 1000;
  const target = now.getTime() + offsetMinutes * 60 * 1000;
  return {
    from: new Date(target - halfWindowMs),
    to: new Date(target + halfWindowMs),
  };
}

function displayName(user: UserDoc | null | undefined): string | null {
  if (!user) return null;
  const first = user.firstname?.trim() || user.name?.trim();
  return first || null;
}

function sessionTitle(session: SessionDoc): string {
  if (session.name?.trim()) return session.name.trim();
  const type = session.session_type.replace("-", " ");
  return `${type} · ${session.duration_min} min`;
}

async function loadUserNames(userIds: string[]): Promise<Map<string, UserDoc>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, UserDoc>();
  if (unique.length === 0) return map;

  const db = await getDb();
  const objectIds = unique
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const users = (await db
    .collection<UserDoc>("users")
    .find({ _id: { $in: objectIds } })
    .project({ firstname: 1, name: 1, username: 1 })
    .toArray()) as UserDoc[];

  for (const u of users) {
    map.set(String(u._id), u);
  }
  return map;
}

export async function toReminderItems(
  sessions: SessionDoc[],
  userId: string,
): Promise<SessionReminderItem[]> {
  const partnerIds: string[] = [];
  for (const s of sessions) {
    const others = (s.session_participants ?? [])
      .map((p) => String(p.user_id))
      .filter((id) => id !== userId);
    if (others[0]) partnerIds.push(others[0]);
    if (String(s.owner_id) !== userId && s.owner_id) partnerIds.push(String(s.owner_id));
  }

  const names = await loadUserNames(partnerIds);

  return sessions.map((s) => {
    const participantIds = (s.session_participants ?? []).map((p) =>
      String(p.user_id),
    );
    const partnerId =
      participantIds.find((id) => id !== userId) ??
      (String(s.owner_id) !== userId ? String(s.owner_id) : null);
    const partner = partnerId ? names.get(partnerId) : null;

    return {
      id: String(s._id),
      startTime: new Date(s.start_time),
      endTime: new Date(s.end_time),
      durationMin: s.duration_min,
      sessionType: s.session_type,
      title: sessionTitle(s),
      partnerLabel: partner ? displayName(partner) : null,
      joinUrl: sessionJoinUrl(String(s._id)),
    };
  });
}

export async function findReminderRecipients(
  timing: SessionReminderTiming,
): Promise<ReminderRecipient[]> {
  const db = await getDb();
  const users = (await db
    .collection<UserDoc>("users")
    .find({
      email: { $exists: true, $type: "string", $ne: "" },
      "preferences.emailSessionReminders": { $ne: false },
    })
    .project({ email: 1, firstname: 1, name: 1, preferences: 1 })
    .toArray()) as UserDoc[];

  const out: ReminderRecipient[] = [];
  for (const user of users) {
    const resolved = resolveReminderTiming(user.preferences);
    if (resolved !== timing) continue;
    const email = user.email?.trim();
    if (!email) continue;
    out.push({
      userId: String(user._id),
      email,
      firstName: displayName(user),
      timing,
    });
  }
  return out;
}

export async function findUserSessionsInRange(
  userId: string,
  startFrom: Date,
  startTo: Date,
  now: Date,
): Promise<SessionDoc[]> {
  const db = await getDb();
  return db
    .collection<SessionDoc>("sessions")
    .find({
      start_time: { $gte: startFrom, $lt: startTo },
      end_time: { $gt: now },
      $or: [{ owner_id: userId }, { "session_participants.user_id": userId }],
    })
    .sort({ start_time: 1 })
    .toArray();
}

export async function markReminderSent(input: {
  userId: string;
  kind: SessionReminderTiming;
  dedupeKey: string;
}): Promise<boolean> {
  const db = await getDb();
  try {
    await db.collection("email_reminders").insertOne({
      userId: input.userId,
      kind: input.kind,
      dedupeKey: input.dedupeKey,
      sentAt: new Date(),
    });
    return true;
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 11000) return false;
    throw err;
  }
}

export function joinWindowNote(): string {
  return `You can join the live call from ${CALL_JOIN_GRACE_MINUTES} minutes before the session starts.`;
}
