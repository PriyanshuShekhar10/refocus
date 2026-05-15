import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../../helpers";
import { ObjectId } from "mongodb";

const sessionsCol = mockCollection();
const db = mockDb({ sessions: sessionsCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { POST } from "@/app/api/sessions/[id]/join/route";

const USER_ID = "user123";
const SESSION_ID = new ObjectId();

/** Times far enough in the future to never collide with "now" during tests. */
const FUTURE_START = new Date(Date.now() + 60 * 60 * 1000);
const FUTURE_END = new Date(FUTURE_START.getTime() + 25 * 60 * 1000);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/sessions/:id/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ID);
  });

  it("returns 401 when not authenticated", async () => {
    mockSession(null);
    const req = mockRequest(`/api/sessions/${SESSION_ID}/join`, {
      body: {},
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(SESSION_ID)))
    );
    expect(status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 404 when session does not exist", async () => {
    sessionsCol.findOne.mockResolvedValue(null);

    const req = mockRequest(`/api/sessions/${SESSION_ID}/join`, {
      body: {},
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(SESSION_ID)))
    );
    expect(status).toBe(404);
    expect(json.error).toBe("Not found");
  });

  it("returns ok when user is already a participant", async () => {
    sessionsCol.findOne.mockResolvedValue({
      _id: SESSION_ID,
      owner_id: "owner1",
      start_time: FUTURE_START,
      end_time: FUTURE_END,
      session_participants: [{ user_id: USER_ID, joined_at: new Date() }],
    });

    const req = mockRequest(`/api/sessions/${SESSION_ID}/join`, {
      body: {},
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(SESSION_ID)))
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("returns 409 when session already has 2 participants", async () => {
    // First findOne: pre-fetch the session (full slot, user not in).
    sessionsCol.findOne.mockResolvedValueOnce({
      _id: SESSION_ID,
      owner_id: "owner1",
      start_time: FUTURE_START,
      end_time: FUTURE_END,
      session_participants: [
        { user_id: "other1", joined_at: new Date() },
        { user_id: "other2", joined_at: new Date() },
      ],
    });
    // Second findOne: overlap check (no conflict for this user).
    sessionsCol.findOne.mockResolvedValueOnce(null);
    // Atomic update fails because the slot is full.
    sessionsCol.findOneAndUpdate.mockResolvedValue(null);
    // Third findOne: distinguish-reason re-fetch.
    sessionsCol.findOne.mockResolvedValueOnce({
      _id: SESSION_ID,
      owner_id: "owner1",
      session_participants: [
        { user_id: "other1", joined_at: new Date() },
        { user_id: "other2", joined_at: new Date() },
      ],
    });

    const req = mockRequest(`/api/sessions/${SESSION_ID}/join`, {
      body: {},
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(SESSION_ID)))
    );
    expect(status).toBe(409);
    expect(json.error).toBe("Session already has 2 participants");
  });

  it("successfully joins when atomic update succeeds", async () => {
    // Pre-fetch: open slot in the future, user not in.
    sessionsCol.findOne.mockResolvedValueOnce({
      _id: SESSION_ID,
      owner_id: "owner1",
      start_time: FUTURE_START,
      end_time: FUTURE_END,
      session_participants: [{ user_id: "owner1", joined_at: new Date() }],
    });
    // Overlap check: no conflict.
    sessionsCol.findOne.mockResolvedValueOnce(null);
    sessionsCol.findOneAndUpdate.mockResolvedValue({
      _id: SESSION_ID,
      owner_id: "owner1",
      session_participants: [
        { user_id: "owner1", joined_at: new Date() },
        { user_id: USER_ID, joined_at: new Date(), quiet: false },
      ],
      status: "booked",
    });

    const req = mockRequest(`/api/sessions/${SESSION_ID}/join`, {
      body: {},
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(SESSION_ID)))
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("uses atomic findOneAndUpdate with correct filter conditions", async () => {
    sessionsCol.findOne.mockResolvedValueOnce({
      _id: SESSION_ID,
      owner_id: "owner1",
      start_time: FUTURE_START,
      end_time: FUTURE_END,
      session_participants: [{ user_id: "owner1", joined_at: new Date() }],
    });
    sessionsCol.findOne.mockResolvedValueOnce(null);
    sessionsCol.findOneAndUpdate.mockResolvedValue({
      _id: SESSION_ID,
      session_participants: [{ user_id: USER_ID }],
    });

    const req = mockRequest(`/api/sessions/${SESSION_ID}/join`, {
      body: { quiet: true },
    });
    await POST(req, makeParams(String(SESSION_ID)));

    const [filter, update, options] = sessionsCol.findOneAndUpdate.mock.calls[0];

    // Verify atomic filter prevents race conditions
    expect(filter.$and).toBeDefined();
    expect(filter.$and).toHaveLength(2);
    // Must check < 2 participants
    expect(filter.$and[0].$or).toContainEqual({
      "session_participants.1": { $exists: false },
    });
    // Must check user not already in
    expect(filter.$and[1]).toEqual({
      "session_participants.user_id": { $ne: USER_ID },
    });
    // Uses returnDocument: "after"
    expect(options.returnDocument).toBe("after");

    // Verify quiet flag is passed through
    const pushed = update.$push.session_participants;
    expect(pushed.quiet).toBe(true);
  });

  it("returns 400 when session has already ended", async () => {
    const pastStart = new Date(Date.now() - 60 * 60 * 1000);
    const pastEnd = new Date(pastStart.getTime() + 25 * 60 * 1000);
    sessionsCol.findOne.mockResolvedValueOnce({
      _id: SESSION_ID,
      owner_id: "owner1",
      start_time: pastStart,
      end_time: pastEnd,
      session_participants: [{ user_id: "owner1", joined_at: new Date() }],
    });

    const req = mockRequest(`/api/sessions/${SESSION_ID}/join`, {
      body: {},
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(SESSION_ID)))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("This session has already ended");
  });

  it("returns 409 when joining would overlap with another session", async () => {
    sessionsCol.findOne.mockResolvedValueOnce({
      _id: SESSION_ID,
      owner_id: "owner1",
      start_time: FUTURE_START,
      end_time: FUTURE_END,
      session_participants: [{ user_id: "owner1", joined_at: new Date() }],
    });
    // Overlap check finds another session the user is in.
    sessionsCol.findOne.mockResolvedValueOnce({
      _id: new ObjectId(),
    });

    const req = mockRequest(`/api/sessions/${SESSION_ID}/join`, {
      body: {},
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(SESSION_ID)))
    );
    expect(status).toBe(409);
    expect(json.error).toBe("You already have a session during this time");
  });

  it("returns 400 for an invalid session id", async () => {
    const req = mockRequest(`/api/sessions/not-an-objectid/join`, {
      body: {},
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams("not-an-objectid"))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Invalid session id");
  });
});
