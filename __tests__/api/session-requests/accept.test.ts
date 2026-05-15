import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../../helpers";
import { ObjectId } from "mongodb";

const rl = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  rateLimitedResponse: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: rl.checkRateLimit,
  rateLimitedResponse: rl.rateLimitedResponse,
}));

const sessionRequestsCol = mockCollection();
const sessionsCol = mockCollection();
const messagesCol = mockCollection();
const db = mockDb({
  session_requests: sessionRequestsCol,
  sessions: sessionsCol,
  messages: messagesCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/sse", () => ({
  publish: vi.fn().mockResolvedValue(undefined),
  sessionsChannel: () => "sessions:updates",
  chatChannel: (a: string, b: string) => `chat:${[a, b].sort().join(":")}`,
}));

vi.mock("@/lib/ably-server", () => ({
  publishAbly: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/session-requests/[id]/route";

const RECIPIENT = "recipient-user";
const REQUESTER = "requester-user";
const REQUEST_ID = new ObjectId();

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const FUTURE_START = new Date(Date.now() + 60 * 60 * 1000);

function pendingRequestDoc() {
  return {
    _id: REQUEST_ID,
    from_user_id: REQUESTER,
    to_user_id: RECIPIENT,
    start_time: FUTURE_START,
    duration_min: 25,
    status: "pending",
  };
}

describe("POST /api/session-requests/:id (accept/decline)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(RECIPIENT);
    rl.checkRateLimit.mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    rl.rateLimitedResponse.mockReturnValue(
      new Response(JSON.stringify({ error: "Too many" }), { status: 429 }),
    );
    sessionsCol.findOne.mockResolvedValue(null); // no overlap by default
    sessionsCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    sessionRequestsCol.findOneAndUpdate.mockResolvedValue(pendingRequestDoc());
    sessionRequestsCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
    messagesCol.updateMany.mockResolvedValue({ modifiedCount: 0 });
  });

  it("returns 400 for invalid action", async () => {
    const req = mockRequest(`/api/session-requests/${REQUEST_ID}`, {
      body: { action: "maybe" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID))),
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Invalid action");
  });

  it("returns 400 for invalid request id", async () => {
    const req = mockRequest(`/api/session-requests/abc`, {
      body: { action: "accept" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams("abc")),
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Invalid request id");
  });

  it("creates a session on accept when neither party has a conflict", async () => {
    const req = mockRequest(`/api/session-requests/${REQUEST_ID}`, {
      body: { action: "accept" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID))),
    );
    expect(status).toBe(200);
    expect(json.sessionId).toBeDefined();
    expect(sessionsCol.insertOne).toHaveBeenCalled();
    const inserted = sessionsCol.insertOne.mock.calls[0][0];
    expect(inserted.owner_id).toBe(REQUESTER);
    expect(inserted.session_participants).toHaveLength(2);
    expect(inserted.session_participants.map((p: { user_id: string }) => p.user_id))
      .toEqual([REQUESTER, RECIPIENT]);
  });

  it("rolls back to declined when the requester has a conflict at accept time", async () => {
    // First overlap check (requester) finds a conflict.
    sessionsCol.findOne.mockResolvedValueOnce({ _id: new ObjectId() });
    const req = mockRequest(`/api/session-requests/${REQUEST_ID}`, {
      body: { action: "accept" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID))),
    );
    expect(status).toBe(409);
    expect(json.error).toMatch(/requester now has a conflict/i);
    // No session was created.
    expect(sessionsCol.insertOne).not.toHaveBeenCalled();
    // The request was rolled back to declined.
    const lastUpdate = sessionRequestsCol.updateOne.mock.calls[0][1].$set;
    expect(lastUpdate.status).toBe("declined");
  });

  it("rolls back when the start time has already passed", async () => {
    sessionRequestsCol.findOneAndUpdate.mockResolvedValueOnce({
      ...pendingRequestDoc(),
      start_time: new Date(Date.now() - 60_000), // in the past
    });
    const req = mockRequest(`/api/session-requests/${REQUEST_ID}`, {
      body: { action: "accept" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID))),
    );
    expect(status).toBe(409);
    expect(json.error).toMatch(/already passed/i);
    expect(sessionsCol.insertOne).not.toHaveBeenCalled();
  });

  it("returns 400 when the request was already responded to", async () => {
    sessionRequestsCol.findOneAndUpdate.mockResolvedValueOnce(null);
    sessionRequestsCol.findOne.mockResolvedValueOnce({
      ...pendingRequestDoc(),
      status: "accepted",
    });
    const req = mockRequest(`/api/session-requests/${REQUEST_ID}`, {
      body: { action: "accept" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID))),
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Already responded");
  });

  it("returns 403 when current user is not the recipient", async () => {
    sessionRequestsCol.findOneAndUpdate.mockResolvedValueOnce(null);
    sessionRequestsCol.findOne.mockResolvedValueOnce({
      ...pendingRequestDoc(),
      to_user_id: "someone-else",
    });
    const req = mockRequest(`/api/session-requests/${REQUEST_ID}`, {
      body: { action: "accept" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID))),
    );
    expect(status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });
});
