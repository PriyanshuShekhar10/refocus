import { Db } from "mongodb";
import { broadcastEvent } from "./broadcaster";
import { chatChannel, userChannel } from "./sse";
import { hasSessionOverlap } from "./sessionOverlap";
import {
  BOOKING_TIME_STEP_MINUTES,
  isBookingStartAligned,
} from "@/constants/calendar";

export const DURATION_OPTIONS = [25, 50, 75] as const;
export type DurationMin = (typeof DURATION_OPTIONS)[number];
export const MAX_BOOKING_HORIZON_DAYS = 90;

export async function createSessionRequest(params: {
  db: Db;
  currentUserId: string;
  friendId: string;
  start: string;
  durationMin: number;
  message?: string;
  goal?: string;
}) {
  const { db, currentUserId, friendId, start, durationMin, message, goal } = params;

  if (!DURATION_OPTIONS.includes(durationMin as DurationMin)) {
    throw new Error(`Invalid durationMin (allowed: ${DURATION_OPTIONS.join(", ")})`);
  }
  
  const s = new Date(start);
  if (isNaN(s.getTime())) throw new Error("Invalid start");
  if (!isBookingStartAligned(s)) {
    throw new Error(
      `Start time must be on a ${BOOKING_TIME_STEP_MINUTES}-minute mark (:00 or :30)`,
    );
  }
  
  const now = new Date();
  if (s.getTime() <= now.getTime()) {
    throw new Error("Cannot request a session in the past");
  }
  
  const maxFuture = new Date(now.getTime() + MAX_BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000);
  if (s.getTime() > maxFuture.getTime()) {
    throw new Error(`Cannot request a session more than ${MAX_BOOKING_HORIZON_DAYS} days in advance`);
  }
  
  const end = new Date(s.getTime() + durationMin * 60_000);
  if (await hasSessionOverlap(db, currentUserId, s, end)) {
    throw new Error("You already have a session during this time");
  }
  if (await hasSessionOverlap(db, friendId, s, end)) {
    throw new Error("Your friend already has a session during this time");
  }

  const normalizedMessage = typeof message === "string" ? message.trim() : "";
  const normalizedGoal = typeof goal === "string" ? goal.trim() : "";
  const trimmedMessage = normalizedMessage ? normalizedMessage.slice(0, 500) : null;
  const trimmedGoal = normalizedGoal ? normalizedGoal.slice(0, 500) : null;

  const existingRequest = await db.collection("session_requests").findOne({
    from_user_id: currentUserId,
    to_user_id: friendId,
    start_time: s,
    duration_min: durationMin,
    status: "pending",
  });
  if (existingRequest) {
    throw new Error("A pending request for this slot already exists");
  }

  const sr = await db.collection("session_requests").insertOne({
    from_user_id: currentUserId,
    to_user_id: friendId,
    start_time: s,
    duration_min: durationMin,
    message: trimmedMessage,
    goal: trimmedGoal,
    response_message: null,
    status: "pending",
    created_at: new Date(),
    responded_at: null,
  });

  const insert = await db.collection("messages").insertOne({
    from_user_id: currentUserId,
    to_user_id: friendId,
    type: "session-request",
    payload: {
      sessionRequestId: String(sr.insertedId),
      start: s.toISOString(),
      durationMin,
      message: trimmedMessage,
      goal: trimmedGoal,
      status: "pending",
      from_user_id: currentUserId,
      to_user_id: friendId,
    },
    created_at: new Date(),
    read_at: null,
    deleted: false,
  });

  const channel = chatChannel(currentUserId, friendId);
  const srMsg = {
    id: String(insert.insertedId),
    from_user_id: currentUserId,
    to_user_id: friendId,
    type: "session-request" as const,
    payload: {
      sessionRequestId: String(sr.insertedId),
      start: s.toISOString(),
      durationMin,
      message: trimmedMessage,
      goal: trimmedGoal,
      status: "pending",
      from_user_id: currentUserId,
      to_user_id: friendId,
    },
    created_at: new Date().toISOString(),
  };

  await broadcastEvent(channel, {
    type: "message:new",
    payload: srMsg,
  });
  await broadcastEvent(userChannel(friendId), {
    type: "unread:inc",
    payload: { friendId: currentUserId, delta: 1 },
  });

  return { id: String(insert.insertedId), sessionRequestId: String(sr.insertedId) };
}
