import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { listPushTokensForUser } from "@/lib/push/devices";
import { getFreshPushPresence } from "@/lib/push/presence";
import { notifyUser } from "@/lib/push/send";

export const runtime = "nodejs";

/**
 * GET /api/push/test — diagnostics for the signed-in user's push setup.
 * Does not send a notification.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [tokens, presence, user] = await Promise.all([
    listPushTokensForUser(userId),
    getFreshPushPresence(userId),
    (async () => {
      const db = await getDb();
      return db.collection("users").findOne(
        { _id: new ObjectId(userId) },
        { projection: { preferences: 1 } },
      );
    })(),
  ]);

  const prefs = (user?.preferences ?? {}) as {
    pushSessionReminders?: boolean;
    pushFriendRequests?: boolean;
    pushChatMessages?: boolean;
  };

  return NextResponse.json({
    ok: true,
    userId,
    deviceCount: tokens.length,
    hasDevices: tokens.length > 0,
    // Truncate tokens so logs stay safe to share
    devicesPreview: tokens.map((token) => ({
      suffix: token.slice(-12),
      looksLikeExpo: token.startsWith("ExponentPushToken["),
    })),
    presence: presence
      ? {
          inCall: presence.inCall,
          sessionId: presence.sessionId,
          updatedAt: presence.updatedAt,
        }
      : null,
    preferences: {
      pushSessionReminders: prefs.pushSessionReminders !== false,
      pushFriendRequests: prefs.pushFriendRequests !== false,
      pushChatMessages: prefs.pushChatMessages !== false,
    },
    hint:
      tokens.length === 0
        ? "No devices registered. Open the mobile app after a rebuild that includes expo-notifications, allow alerts, then retry."
        : "POST /api/push/test to send yourself a test notification.",
  });
}

/**
 * POST /api/push/test — send a test push to every device for this user.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const tokens = await listPushTokensForUser(userId);
  if (tokens.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "No push devices registered for this account",
        deviceCount: 0,
        hint: "Sign in on a rebuilt mobile app, allow notifications, then call GET /api/push/test.",
      },
      { status: 400 },
    );
  }

  const result = await notifyUser({
    userId,
    respectInCallQuiet: false,
    message: {
      title: "Refocus test",
      body: "Push is working. You’re all set.",
      channel: "sessions",
      data: { type: "session_reminder", sessionId: "test" },
    },
  });

  return NextResponse.json({
    ok: result.sent > 0,
    deviceCount: tokens.length,
    result,
    hint:
      result.sent > 0
        ? "Check your phone for “Refocus test”."
        : result.reason === "in_call"
          ? "Presence says you are in a call; this test ignores that, so check Expo tickets."
          : "Expo did not accept the send. Confirm the token is still valid and EAS push credentials exist.",
  });
}
