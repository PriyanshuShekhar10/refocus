import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";

import {
  DEFAULT_SESSION_REMINDER_TIMING,
  SESSION_REMINDER_TIMINGS,
  type SessionReminderTiming,
} from "@/lib/sessionReminderPrefs";

/**
 * Read and update the current user's preferences. Stored under
 * `users.preferences` as a nested doc. All flags are optional and merged
 * with sensible defaults on read.
 */

type Prefs = {
  defaultSessionLength: 25 | 50 | 75;
  focusModeDefault: boolean;
  publicProfile: boolean;
  allowFriendRequests: boolean;
  showInGlobalChat: boolean;
  emailSessionReminders: boolean;
  sessionReminderTiming: SessionReminderTiming;
  emailFriendRequests: boolean;
  emailWeeklyDigest: boolean;
};

const DEFAULTS: Prefs = {
  defaultSessionLength: 50,
  focusModeDefault: true,
  publicProfile: true,
  allowFriendRequests: true,
  showInGlobalChat: true,
  emailSessionReminders: true,
  sessionReminderTiming: DEFAULT_SESSION_REMINDER_TIMING,
  emailFriendRequests: true,
  emailWeeklyDigest: false,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { preferences: 1 } }
    );

  const stored = (user?.preferences ?? {}) as Partial<Prefs>;
  return NextResponse.json({ preferences: { ...DEFAULTS, ...stored } });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = (await req.json().catch(() => ({}))) as Partial<Prefs>;
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (
    body.defaultSessionLength === 25 ||
    body.defaultSessionLength === 50 ||
    body.defaultSessionLength === 75
  ) {
    update["preferences.defaultSessionLength"] = body.defaultSessionLength;
  }
  const boolKeys: (keyof Prefs)[] = [
    "focusModeDefault",
    "publicProfile",
    "allowFriendRequests",
    "showInGlobalChat",
    "emailSessionReminders",
    "emailFriendRequests",
    "emailWeeklyDigest",
  ];
  for (const k of boolKeys) {
    if (typeof body[k] === "boolean") {
      update[`preferences.${k}`] = body[k];
    }
  }
  if (
    body.sessionReminderTiming &&
    SESSION_REMINDER_TIMINGS.includes(body.sessionReminderTiming)
  ) {
    update["preferences.sessionReminderTiming"] = body.sessionReminderTiming;
  }

  if (Object.keys(update).length === 1) {
    // Only updatedAt — nothing to do.
    return NextResponse.json({ ok: true, noop: true });
  }

  const db = await getDb();
  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(userId) }, { $set: update });

  return NextResponse.json({ ok: true });
}
