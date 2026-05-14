import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { mockRequest, mockSession, parseResponse } from "../../helpers";

const mocks = vi.hoisted(() => ({
  sessionsCol: {
    findOne: vi.fn(),
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

vi.mock("@/lib/daily", () => ({
  createOrGetDailyRoom: mocks.createOrGetDailyRoom,
  createDailyMeetingToken: mocks.createDailyMeetingToken,
}));

import { POST as postDailyRoom } from "@/app/api/sessions/[id]/daily/route";
import { POST as postDailyToken } from "@/app/api/sessions/[id]/daily/token/route";

const OWNER_ID = "owner-1";
const PARTICIPANT_ID = "participant-1";
const STRANGER_ID = "stranger-1";
const SESSION_ID = new ObjectId().toHexString();

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("Daily session endpoints", () => {
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

  it("returns 403 for non-member on POST /daily", async () => {
    mockSession(STRANGER_ID);
    const req = mockRequest(`/api/sessions/${SESSION_ID}/daily`);
    const { status, json } = await parseResponse(
      await postDailyRoom(req, makeParams(SESSION_ID)),
    );

    expect(status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("returns 403 for non-member on POST /daily/token", async () => {
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

    const roomReq = mockRequest(`/api/sessions/${SESSION_ID}/daily`);
    const roomRes = await parseResponse(
      await postDailyRoom(roomReq, makeParams(SESSION_ID)),
    );
    expect(roomRes.status).toBe(500);
    expect(roomRes.json.error).toBe("Internal server error");
    expect(roomRes.json.error).not.toContain("DAILY_API_KEY");
    expect(roomRes.json.error).not.toContain("createOrGetDailyRoom");

    const tokenReq = mockRequest(`/api/sessions/${SESSION_ID}/daily/token`);
    const tokenRes = await parseResponse(
      await postDailyToken(tokenReq, makeParams(SESSION_ID)),
    );
    expect(tokenRes.status).toBe(500);
    expect(tokenRes.json.error).toBe("Internal server error");
    expect(tokenRes.json.error).not.toContain("DAILY_API_KEY");
    expect(tokenRes.json.error).not.toContain("createOrGetDailyRoom");
  });
});
