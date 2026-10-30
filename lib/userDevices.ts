import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type DeviceSignalType = "cookie" | "fingerprint";

export type DeviceSignalDoc = {
  signalType: DeviceSignalType;
  signalValue: string;
  userId: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  count: number;
  lastIp: string | null;
  userAgent: string | null;
  firstSeenSource: "login" | "signup";
};

async function upsertSignal(params: {
  signalType: DeviceSignalType;
  signalValue: string;
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
  source: "login" | "signup";
  now: Date;
}): Promise<void> {
  const db = await getDb();
  await db.collection<DeviceSignalDoc>("device_signals").updateOne(
    { signalType: params.signalType, signalValue: params.signalValue, userId: params.userId },
    {
      $set: {
        lastSeenAt: params.now,
        ...(params.ip ? { lastIp: params.ip } : {}),
        ...(params.userAgent ? { userAgent: params.userAgent } : {}),
      },
      $setOnInsert: {
        signalType: params.signalType,
        signalValue: params.signalValue,
        userId: params.userId,
        firstSeenAt: params.now,
        firstSeenSource: params.source,
      },
      $inc: { count: 1 },
    },
    { upsert: true },
  );
}

/**
 * Record that this login/signup happened from this device-id cookie and/or
 * browser fingerprint. Either (or both) signals may be absent — a cleared
 * cookie, a blocked/failed fingerprint computation, or a non-browser client
 * all leave one or both null, which is a silent no-op per signal.
 *
 * Best-effort only: a Mongo hiccup here must never surface as an unhandled
 * rejection on a login/signup request (mirrors logBannedIpSignupAttempt's
 * own internal try/catch, not recordLoginIp's bare `void` call).
 */
export async function recordDeviceSeen(params: {
  userId: string;
  deviceId?: string | null;
  fingerprint?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  source: "login" | "signup";
}): Promise<void> {
  if (!ObjectId.isValid(params.userId)) return;
  if (!params.deviceId && !params.fingerprint) return;

  try {
    const now = new Date();
    await Promise.all([
      params.deviceId
        ? upsertSignal({
            signalType: "cookie",
            signalValue: params.deviceId,
            userId: params.userId,
            ip: params.ip,
            userAgent: params.userAgent,
            source: params.source,
            now,
          })
        : null,
      params.fingerprint
        ? upsertSignal({
            signalType: "fingerprint",
            signalValue: params.fingerprint,
            userId: params.userId,
            ip: params.ip,
            userAgent: params.userAgent,
            source: params.source,
            now,
          })
        : null,
    ]);
  } catch (err) {
    console.error("[userDevices] recordDeviceSeen failed:", err);
  }
}

export async function getUserDeviceSignals(userId: string): Promise<DeviceSignalDoc[]> {
  if (!ObjectId.isValid(userId)) return [];
  const db = await getDb();
  return db
    .collection<DeviceSignalDoc>("device_signals")
    .find({ userId })
    .sort({ lastSeenAt: -1 })
    .toArray();
}
