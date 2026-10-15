import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { mockRequest, mockSession, parseResponse } from "../../helpers";

const mocks = vi.hoisted(() => ({
  sessionsCol: {
    findOne: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
  checkRateLimit: vi.fn(),
  rateLimitedResponse: vi.fn(),
  createOrGetDailyRoom: vi.fn(),
  createDailyMeetingToken: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: vi.fn(() => mocks.sessionsCol),
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  rateLimitedResponse: mocks.rateLimitedResponse,
}));

vi.mock("@/lib/providers/video/daily/rooms", () => ({
  createOrGetDailyRoom: mocks.createOrGetDailyRoom,
  createDailyMeetingToken: mocks.createDailyMeetingToken,
}));

import { POST as postDailyToken } from "@/app/api/sessions/[id]/daily/token/route";
import { POST as postVideoToken } from "@/app/api/sessions/[id]/video/token/route";

const OWNER_ID = "owner-1";
const PARTICIPANT_ID = "participant-1";
const STRANGER_ID = "stranger-1";
const SESSION_ID = new ObjectId().toHexString();

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/sessions/:id/daily/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mocks.rateLimitedResponse.mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
    );
    mocks.sessionsCol.findOne.mockResolvedValue({
      _id: new ObjectId(SESSION_ID),
      owner_id: OWNER_ID,
      start_time: new Date(Date.now() - 60 * 1000),
      end_time: new Date(Date.now() + 60 * 60 * 1000),
      session_participants: [{ user_id: PARTICIPANT_ID }],
    });
    mocks.createOrGetDailyRoom.mockResolvedValue({
      room: {},
      roomName: `session-${SESSION_ID}`,
      domain: "refocus.daily.co",
    });
    mocks.createDailyMeetingToken.mockResolvedValue("token-123");
  });

  it("returns 403 for non-member", async () => {
    mockSession(STRANGER_ID);
    const req = mockRequest(`/api/sessions/${SESSION_ID}/daily/token`);
    const { status, json } = await parseResponse(
      await postDailyToken(req, makeParams(SESSION_ID)),
    );

    expect(status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("returns domain, roomName, token for owner and participant", async () => {
    mockSession(OWNER_ID);
    const ownerReq = mockRequest(`/api/sessions/${SESSION_ID}/daily/token`);
    const ownerRes = await parseResponse(
      await postDailyToken(ownerReq, makeParams(SESSION_ID)),
    );

    expect(ownerRes.status).toBe(200);
    expect(ownerRes.json).toEqual({
      provider: "daily",
      token: "token-123",
      roomName: `session-${SESSION_ID}`,
      domain: "refocus.daily.co",
    });

    mockSession(PARTICIPANT_ID);
    const participantReq = mockRequest(`/api/sessions/${SESSION_ID}/daily/token`);
    const participantRes = await parseResponse(
      await postDailyToken(participantReq, makeParams(SESSION_ID)),
    );

    expect(participantRes.status).toBe(200);
    expect(participantRes.json).toEqual({
      provider: "daily",
      token: "token-123",
      roomName: `session-${SESSION_ID}`,
      domain: "refocus.daily.co",
    });
  });

  it("returns generic 500 body when Daily room creation fails", async () => {
    mockSession(OWNER_ID);
    mocks.createOrGetDailyRoom.mockRejectedValue(
      new Error("Missing DAILY_API_KEY createOrGetDailyRoom"),
    );

    const tokenReq = mockRequest(`/api/sessions/${SESSION_ID}/daily/token`);
    const tokenRes = await parseResponse(
      await postDailyToken(tokenReq, makeParams(SESSION_ID)),
    );
    expect(tokenRes.status).toBe(500);
    expect(tokenRes.json.error).toBe("Internal server error");
    expect(tokenRes.json.error).not.toContain("DAILY_API_KEY");
    expect(tokenRes.json.error).not.toContain("createOrGetDailyRoom");
  });

  it("serves the legacy /daily/token path with the same handler as /video/token", () => {
    expect(postDailyToken).toBe(postVideoToken);
  });

  it("keeps today's room and token expiry rules", async () => {
    mockSession(OWNER_ID);
    const end = new Date(Date.now() + 60 * 60 * 1000);
    mocks.sessionsCol.findOne.mockResolvedValue({
      _id: new ObjectId(SESSION_ID),
      owner_id: OWNER_ID,
      start_time: new Date(Date.now() - 60 * 1000),
      end_time: end,
      session_participants: [{ user_id: PARTICIPANT_ID }],
    });
    await postVideoToken(mockRequest(`/api/sessions/${SESSION_ID}/video/token`), makeParams(SESSION_ID));
    const endSec = Math.floor(end.getTime() / 1000);
    expect(mocks.createOrGetDailyRoom).toHaveBeenCalledWith(SESSION_ID, endSec + 30 * 60);
    expect(mocks.createDailyMeetingToken.mock.calls[0][2]).toMatchObject({ exp: endSec + 10 * 60 });
  });

  it("pins the call provider on the session the first time someone joins", async () => {
    mockSession(OWNER_ID);
    await postVideoToken(mockRequest(`/api/sessions/${SESSION_ID}/video/token`), makeParams(SESSION_ID));
    expect(mocks.sessionsCol.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(SESSION_ID), video_provider: { $exists: false } },
      { $set: { video_provider: "daily" } },
    );
  });

  it("uses the provider already stored on the session without re-pinning", async () => {
    mockSession(OWNER_ID);
    mocks.sessionsCol.findOne.mockResolvedValue({
      _id: new ObjectId(SESSION_ID),
      owner_id: OWNER_ID,
      start_time: new Date(Date.now() - 60 * 1000),
      end_time: new Date(Date.now() + 60 * 60 * 1000),
      session_participants: [{ user_id: PARTICIPANT_ID }],
      video_provider: "daily",
    });
    const res = await parseResponse(
      await postVideoToken(mockRequest(`/api/sessions/${SESSION_ID}/video/token`), makeParams(SESSION_ID)),
    );
    expect(res.json.provider).toBe("daily");
    expect(mocks.sessionsCol.updateOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ video_provider: { $exists: false } }),
      expect.anything(),
    );
  });
});
