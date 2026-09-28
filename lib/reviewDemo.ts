import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { isWithinCallWindow } from "@/lib/sessionWindow";

export const REVIEW_DEMO_EMAIL = "demo@refocus.co.in";

const SOLO_DURATION_MIN = 50;
const SOLO_MS = SOLO_DURATION_MIN * 60 * 1000;

export function isReviewDemoEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === REVIEW_DEMO_EMAIL;
}

/** True when the standing solo review session should be moved back to "now". */
export function reviewSoloNeedsRefresh(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (!start || !end) return true;
  return !isWithinCallWindow(start, end, now);
}

export async function userIsReviewDemo(userId: string): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const db = await getDb();
  const user = await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { email: 1 } },
  );
  return isReviewDemoEmail(
    typeof user?.email === "string" ? user.email : null,
  );
}

/**
 * Keep one solo focus session for the App Review account, already started and
 * joinable, so a reviewer can open the video call without waiting for a partner.
 */
export async function ensureReviewSoloSession(userId: string): Promise<void> {
  if (!(await userIsReviewDemo(userId))) return;

  const db = await getDb();
  const col = db.collection("sessions");
  const now = new Date();
  const existing = await col.findOne({ owner_id: userId, review_solo: true });
  const start = existing?.start_time as Date | undefined;
  const end = existing?.end_time as Date | undefined;
  if (existing && !reviewSoloNeedsRefresh(start, end, now)) return;

  const endTime = new Date(now.getTime() + SOLO_MS);
  const participant = {
    user_id: userId,
    joined_at: now,
    quiet: false,
    label: "Solo",
  };
  const fields = {
    start_time: now,
    end_time: endTime,
    duration_min: SOLO_DURATION_MIN,
    session_type: "focus" as const,
    status: "available",
    participant_count: 1,
    review_solo: true,
    name: "Solo",
    session_participants: [participant],
    updated_at: now,
  };

  if (!existing) {
    await col.insertOne({
      ...fields,
      owner_id: userId,
      created_at: now,
    });
    return;
  }

  await col.updateOne({ _id: existing._id }, { $set: fields });
}
