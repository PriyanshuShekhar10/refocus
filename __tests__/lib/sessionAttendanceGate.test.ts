import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const sessionsCol = mockCollection();
const requestsCol = mockCollection();
const db = mockDb({
  sessions: sessionsCol,
  session_requests: requestsCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import {
  assertCanBookAnotherSession,
  FIRST_SESSION_REQUIRED_CODE,
  userHasAttendedAnySession,
  countUpcomingSessionsForUser,
} from "@/lib/sessionAttendanceGate";

const USER_ID = "user-gate-1";

describe("sessionAttendanceGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionsCol.findOne.mockResolvedValue(null);
    sessionsCol.countDocuments.mockResolvedValue(0);
    requestsCol.countDocuments.mockResolvedValue(0);
  });

  it("userHasAttendedAnySession is false when no call_joined_at", async () => {
    sessionsCol.findOne.mockResolvedValue(null);
    expect(await userHasAttendedAnySession(db as never, USER_ID)).toBe(false);
  });

  it("userHasAttendedAnySession is true when a session has call_joined_at", async () => {
    sessionsCol.findOne.mockResolvedValue({ _id: new ObjectId() });
    expect(await userHasAttendedAnySession(db as never, USER_ID)).toBe(true);
  });

  it("countUpcomingSessionsForUser uses end_time > now", async () => {
    sessionsCol.countDocuments.mockResolvedValue(2);
    const n = await countUpcomingSessionsForUser(db as never, USER_ID);
    expect(n).toBe(2);
    expect(sessionsCol.countDocuments).toHaveBeenCalled();
  });

  it("allows first booking when never attended and no upcoming", async () => {
    const res = await assertCanBookAnotherSession(db as never, USER_ID);
    expect(res).toBeNull();
  });

  it("blocks second booking when never attended and upcoming >= 1", async () => {
    sessionsCol.countDocuments.mockResolvedValue(1);
    const res = await assertCanBookAnotherSession(db as never, USER_ID);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.code).toBe(FIRST_SESSION_REQUIRED_CODE);
  });

  it("allows booking when user has attended before even with upcoming", async () => {
    sessionsCol.findOne.mockResolvedValue({ _id: new ObjectId() });
    sessionsCol.countDocuments.mockResolvedValue(3);
    const res = await assertCanBookAnotherSession(db as never, USER_ID);
    expect(res).toBeNull();
  });

  it("blocks second pending request when countPendingRequests is true", async () => {
    requestsCol.countDocuments.mockResolvedValue(1);
    const res = await assertCanBookAnotherSession(db as never, USER_ID, {
      countPendingRequests: true,
    });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});
