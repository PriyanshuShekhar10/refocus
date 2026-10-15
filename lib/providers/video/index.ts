import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { CALL_JOIN_GRACE_MINUTES, WRAP_UP_MINUTES } from "@/lib/sessionWindow";
import { dailyVideoProvider } from "./daily";
import { VIDEO_PROVIDER_IDS, type VideoJoin, type VideoProvider, type VideoProviderId } from "./types";

export type { VideoJoin, VideoProvider, VideoProviderId } from "./types";

const PROVIDERS: Record<VideoProviderId, VideoProvider> = {
  daily: dailyVideoProvider,
};

function isVideoProviderId(value: unknown): value is VideoProviderId {
  return typeof value === "string" && (VIDEO_PROVIDER_IDS as readonly string[]).includes(value);
}

/** Provider for new calls: VIDEO_PROVIDER env var, default "daily". */
export function defaultVideoProviderId(): VideoProviderId {
  const configured = process.env.VIDEO_PROVIDER?.trim();
  return isVideoProviderId(configured) ? configured : "daily";
}

export function getVideoProvider(id: VideoProviderId = defaultVideoProviderId()): VideoProvider {
  return PROVIDERS[id];
}

/**
 * The provider a session's call runs on. The first join pins the current
 * default onto the session (`video_provider`), so both participants always end
 * up on the same provider even if the default changes mid-session.
 */
export async function resolveSessionVideoProvider(
  sessionId: string,
  stored?: unknown,
): Promise<VideoProviderId> {
  if (isVideoProviderId(stored)) return stored;
  const fallback = defaultVideoProviderId();
  if (!ObjectId.isValid(sessionId)) return fallback;
  const db = await getDb();
  const _id = new ObjectId(sessionId);
  await db.collection("sessions").updateOne(
    { _id, video_provider: { $exists: false } },
    { $set: { video_provider: fallback } },
  );
  const doc = await db.collection("sessions").findOne({ _id }, { projection: { video_provider: 1 } });
  return isVideoProviderId(doc?.video_provider) ? doc.video_provider : fallback;
}

/**
 * Join a session's call: room lives until 30 min after the session ends; the
 * token until the later of the join grace and wrap-up windows after the end.
 */
export async function issueSessionVideoJoin(input: {
  sessionId: string;
  userId: string;
  userName?: string | null;
  sessionEnd: Date | string;
  storedProvider?: unknown;
}): Promise<VideoJoin> {
  const endSec = Math.floor(new Date(input.sessionEnd).getTime() / 1000);
  const providerId = await resolveSessionVideoProvider(input.sessionId, input.storedProvider);
  return getVideoProvider(providerId).issueJoin({
    sessionId: input.sessionId,
    userId: input.userId,
    userName: input.userName,
    roomExpiresAt: endSec + 30 * 60,
    tokenExpiresAt: endSec + Math.max(CALL_JOIN_GRACE_MINUTES, WRAP_UP_MINUTES) * 60,
  });
}
