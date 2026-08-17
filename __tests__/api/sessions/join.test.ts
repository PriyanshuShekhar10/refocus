import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../../helpers";
import { ObjectId } from "mongodb";

const sessionsCol = mockCollection();
const db = mockDb({ sessions: sessionsCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/ably-server", () => ({
  publishAbly: vi.fn().mockResolvedValue(undefined),
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

  it("returns ok when an existing participant joins after start", async () => {
    const started = new Date(Date.now() - 5 * 60 * 1000);
    const stillRunning = new Date(started.getTime() + 50 * 60 * 1000);
    sessionsCol.findOne.mockResolvedValue({
      _id: SESSION_ID,
      owner_id: USER_ID,
      start_time: started,
      end_time: stillRunning,
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
    expect(sessionsCol.findOneAndUpdate).not.toHaveBeenCalled();
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
      start_time: FUTURE_START,
      end_time: FUTURE_END,
      duration_min: 25,
      session_type: "focus",
      participant_count: 2,
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
      owner_id: "owner1",
      start_time: FUTURE_START,
      end_time: FUTURE_END,
      duration_min: 25,
      session_type: "focus",
      participant_count: 2,
      session_participants: [{ user_id: USER_ID }],
    });

    const req = mockRequest(`/api/sessions/${SESSION_ID}/join`, {
      body: { quiet: true },
    });
    await POST(req, makeParams(String(SESSION_ID)));

    const [filter, update, options] = sessionsCol.findOneAndUpdate.mock.calls[0];

    // Must not allow booking after the session has started
    expect(filter.start_time).toEqual({ $gt: expect.any(Date) });
    // Must check user not already in
    expect(filter["session_participants.user_id"]).toEqual({ $ne: USER_ID });
    // Must check < 2 participants (participant_count or legacy array)
    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { participant_count: { $lt: 2 } },
        expect.objectContaining({ participant_count: { $exists: false } }),
      ]),
    );
    // Uses returnDocument: "after"
    expect(options.returnDocument).toBe("after");

    // Verify quiet flag and participant_count are set
    const pushed = update.$push.session_participants;
    expect(pushed.quiet).toBe(true);
    expect(update.$set.participant_count).toBe(2);
  });

  it("returns 400 when session has already started", async () => {
    const started = new Date(Date.now() - 5 * 60 * 1000);
    const stillRunning = new Date(started.getTime() + 50 * 60 * 1000);
    sessionsCol.findOne.mockResolvedValueOnce({
      _id: SESSION_ID,
      owner_id: "owner1",
      start_time: started,
      end_time: stillRunning,
      session_participants: [{ user_id: "owner1", joined_at: new Date() }],
    });

    const req = mockRequest(`/api/sessions/${SESSION_ID}/join`, {
      body: {},
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(SESSION_ID)))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("This session has already started");
    expect(sessionsCol.findOneAndUpdate).not.toHaveBeenCalled();
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
