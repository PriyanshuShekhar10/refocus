import { NextResponse } from "next/server";
import type { Db } from "mongodb";
import {
  FIRST_SESSION_REQUIRED_CODE,
  FIRST_SESSION_REQUIRED_MESSAGE,
} from "@/lib/sessionAttendanceMessages";

export {
  FIRST_SESSION_REQUIRED_CODE,
  FIRST_SESSION_REQUIRED_MESSAGE,
} from "@/lib/sessionAttendanceMessages";

export function firstSessionRequiredResponse(): NextResponse {
  return NextResponse.json(
    {
      error: FIRST_SESSION_REQUIRED_MESSAGE,
      code: FIRST_SESSION_REQUIRED_CODE,
    },
    { status: 403 },
  );
}

/** True if the user has ever entered a call (`call_joined_at`). */
export async function userHasAttendedAnySession(
  db: Db,
  userId: string,
): Promise<boolean> {
  const hit = await db.collection("sessions").findOne(
    {
      session_participants: {
        $elemMatch: {
          user_id: userId,
          call_joined_at: { $exists: true, $ne: null },
        },
      },
    },
    { projection: { _id: 1 } },
  );
  return Boolean(hit);
}

/** Upcoming or in-progress sessions the user is on (`end_time > now`). */
export async function countUpcomingSessionsForUser(
  db: Db,
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  return db.collection("sessions").countDocuments({
    end_time: { $gt: now },
    $or: [{ owner_id: userId }, { "session_participants.user_id": userId }],
  });
}

/** Pending outgoing friend session requests (booking intent). */
export async function countPendingOutgoingSessionRequests(
  db: Db,
  userId: string,
): Promise<number> {
  return db.collection("session_requests").countDocuments({
    from_user_id: userId,
    status: "pending",
  });
}

/**
 * Zero-attendance users may hold at most one upcoming session (or one pending
 * outgoing request when `countPendingRequests` is true).
 * Returns a 403 response when blocked, otherwise null.
 */
export async function assertCanBookAnotherSession(
  db: Db,
  userId: string,
  options: { countPendingRequests?: boolean; now?: Date } = {},
): Promise<NextResponse | null> {
  if (await userHasAttendedAnySession(db, userId)) return null;

  const upcoming = await countUpcomingSessionsForUser(
    db,
    userId,
    options.now ?? new Date(),
  );
  if (upcoming >= 1) return firstSessionRequiredResponse();

  if (options.countPendingRequests) {
    const pending = await countPendingOutgoingSessionRequests(db, userId);
    if (pending >= 1) return firstSessionRequiredResponse();
  }

  return null;
}
