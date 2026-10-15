/**
 * Characterisation tests for admin test calls: the session they create and the
 * exact room/token requests made to the video provider. Guards the video
 * provider refactor (docs/REFACTOR-PLAN.md, Phase 1).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const sessions = mockCollection();
const db = mockDb({ sessions });
vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn().mockImplementation(() => Promise.resolve(db)) }));
vi.mock("@/lib/daily", () => ({
  createOrGetDailyRoom: vi.fn().mockResolvedValue({ roomName: "room-1", domain: "refocus.daily.co", account: { id: "a1" } }),
  createDailyMeetingToken: vi.fn().mockResolvedValue("tok-1"),
}));

import { createOrGetDailyRoom, createDailyMeetingToken } from "@/lib/daily";
import {
  adminTestCallObjectId,
  createAdminTestCall,
  isValidAdminTestDuration,
  listActiveAdminTestCalls,
} from "@/lib/adminTestCall";

const NOW = new Date("2026-10-20T10:00:00.000Z");
const ADMIN = "cccccccccccccccccccccccc";
const SESSION_ID = new ObjectId();

describe("admin test calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    sessions.insertOne.mockResolvedValue({ insertedId: SESSION_ID });
  });
  afterEach(() => vi.useRealTimers());

  it("creates a solo admin session, a room and a token with today's expiry rules", async () => {
    const result = await createAdminTestCall({ adminUserId: ADMIN, adminName: "  Priya  ", durationMin: 50 });
    const end = new Date(NOW.getTime() + 50 * 60_000);

    const doc = sessions.insertOne.mock.calls[0][0];
    expect(doc).toMatchObject({
      owner_id: ADMIN,
      start_time: NOW,
      end_time: end,
      duration_min: 50,
      status: "available",
      participant_count: 1,
      is_admin_test: true,
      session_participants: [{ user_id: ADMIN, quiet: false }],
    });

    const endSec = Math.floor(end.getTime() / 1000);
    expect(createOrGetDailyRoom).toHaveBeenCalledWith(String(SESSION_ID), endSec + 30 * 60);
    expect(createDailyMeetingToken).toHaveBeenCalledWith("room-1", ADMIN, {
      userName: "Priya",
      exp: endSec + 10 * 60,
      account: { id: "a1" },
    });
    expect(result).toEqual({
      sessionId: String(SESSION_ID),
      startTime: NOW.toISOString(),
      endTime: end.toISOString(),
      durationMin: 50,
      callPagePath: `/sessions/${SESSION_ID}`,
      roomName: "room-1",
      domain: "refocus.daily.co",
      token: "tok-1",
    });
  });

  it("defaults to 25 minutes and the name 'Admin'", async () => {
    const result = await createAdminTestCall({ adminUserId: ADMIN });
    expect(result.durationMin).toBe(25);
    expect(vi.mocked(createDailyMeetingToken).mock.calls[0][2]).toMatchObject({ userName: "Admin" });
  });

  it("validates durations", () => {
    expect(isValidAdminTestDuration(25)).toBe(true);
    expect(isValidAdminTestDuration(50)).toBe(true);
    expect(isValidAdminTestDuration(7)).toBe(false);
    expect(isValidAdminTestDuration("25")).toBe(false);
  });

  it("lists only test calls still inside the join grace window", async () => {
    const live = { _id: new ObjectId(), owner_id: ADMIN, start_time: new Date(NOW.getTime() - 20 * 60_000), end_time: new Date(NOW.getTime() - 5 * 60_000), duration_min: 25 };
    const stale = { ...live, _id: new ObjectId(), end_time: new Date(NOW.getTime() - 11 * 60_000) };
    sessions.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([live, stale]) }) }),
    });
    const rows = await listActiveAdminTestCalls();
    expect(rows.map((r) => r.sessionId)).toEqual([String(live._id)]);
    expect(rows[0]).toMatchObject({ durationMin: 25, createdByUserId: ADMIN, callPagePath: `/sessions/${live._id}` });
  });

  it("parses ids safely", () => {
    expect(adminTestCallObjectId("nope")).toBeNull();
    expect(String(adminTestCallObjectId(String(SESSION_ID)))).toBe(String(SESSION_ID));
  });
});
