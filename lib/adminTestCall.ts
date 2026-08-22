import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { createOrGetDailyRoom, createDailyMeetingToken } from "@/lib/daily";
import {
  CALL_JOIN_GRACE_MINUTES,
  WRAP_UP_MINUTES,
} from "@/lib/sessionAccess";
import {
  DURATION_OPTIONS,
  type DurationMin,
} from "@/constants/calendar";

export type AdminTestCallResult = {
  sessionId: string;
  startTime: string;
  endTime: string;
  durationMin: DurationMin;
  callPagePath: string;
  roomName: string;
  domain: string;
  token: string;
};

export function isValidAdminTestDuration(
  value: unknown,
): value is DurationMin {
  return (
    typeof value === "number" &&
    (DURATION_OPTIONS as readonly number[]).includes(value)
  );
}

export async function createAdminTestCall(params: {
  adminUserId: string;
  adminName?: string | null;
  durationMin?: DurationMin;
}): Promise<AdminTestCallResult> {
  const durationMin = params.durationMin ?? 25;
  const now = new Date();
  const startTime = now;
  const endTime = new Date(now.getTime() + durationMin * 60_000);

  const db = await getDb();
  const insert = await db.collection("sessions").insertOne({
    owner_id: params.adminUserId,
    start_time: startTime,
    end_time: endTime,
    duration_min: durationMin,
    session_type: "focus",
    status: "available",
    participant_count: 1,
    is_admin_test: true,
    name: "Admin test call",
    session_participants: [
      {
        user_id: params.adminUserId,
        joined_at: now,
        quiet: false,
      },
    ],
    created_at: now,
    updated_at: now,
  });

  const sessionId = String(insert.insertedId);
  const sessionEndExp =
    Math.floor(endTime.getTime() / 1000) + 30 * 60;
  const { roomName, domain } = await createOrGetDailyRoom(
    sessionId,
    sessionEndExp,
  );
  const tokenExp =
    Math.floor(endTime.getTime() / 1000) +
    Math.max(CALL_JOIN_GRACE_MINUTES, WRAP_UP_MINUTES) * 60;
  const token = await createDailyMeetingToken(roomName, params.adminUserId, {
    userName: params.adminName?.trim() || "Admin",
    exp: tokenExp,
  });

  return {
    sessionId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationMin,
    callPagePath: `/sessions/${sessionId}`,
    roomName,
    domain,
    token,
  };
}

export async function listActiveAdminTestCalls(): Promise<
  Array<{
    sessionId: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    callPagePath: string;
    createdByUserId: string;
  }>
> {
  const db = await getDb();
  const now = new Date();
  const graceMs = CALL_JOIN_GRACE_MINUTES * 60 * 1000;
  const rows = await db
    .collection("sessions")
    .find({
      is_admin_test: true,
      end_time: { $gte: new Date(now.getTime() - graceMs) },
    })
    .sort({ created_at: -1 })
    .limit(20)
    .toArray();

  return rows
    .filter((row) => {
      const end = row.end_time ? new Date(row.end_time as Date).getTime() : 0;
      return now.getTime() <= end + graceMs;
    })
    .map((row) => ({
      sessionId: String(row._id),
      startTime: new Date(row.start_time as Date).toISOString(),
      endTime: new Date(row.end_time as Date).toISOString(),
      durationMin: (row.duration_min as number) ?? 25,
      callPagePath: `/sessions/${String(row._id)}`,
      createdByUserId: String(row.owner_id),
    }));
}

export function adminTestCallObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}
