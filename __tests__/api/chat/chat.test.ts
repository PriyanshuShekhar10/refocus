import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession, alignedFutureIso } from "../../helpers";
import { ObjectId } from "mongodb";

// Mock rate limiting
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 30,
    remaining: 29,
    reset: Date.now() + 60000,
  }),
  rateLimitedResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

const messagesCol = mockCollection();
const friendRequestsCol = mockCollection();
const sessionRequestsCol = mockCollection();
const sessionsCol = mockCollection();
const db = mockDb({
  messages: messagesCol,
  friend_requests: friendRequestsCol,
  session_requests: sessionRequestsCol,
  sessions: sessionsCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/ably-server", () => ({
  publishAbly: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/chat/[friendId]/route";

const CURRENT_USER = new ObjectId().toString();
const FRIEND_ID = new ObjectId().toString();
const STRANGER_ID = new ObjectId().toString();

function makeParams(friendId: string) {
  return { params: Promise.resolve({ friendId }) };
}

describe("POST /api/chat/:friendId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(CURRENT_USER);
    // Default: users ARE friends
    friendRequestsCol.findOne.mockResolvedValue({
      _id: new ObjectId(),
      from_user_id: CURRENT_USER,
      to_user_id: FRIEND_ID,
      status: "accepted",
    });
    messagesCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    sessionRequestsCol.findOne.mockResolvedValue(null);
    sessionRequestsCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    sessionsCol.findOne.mockResolvedValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    mockSession(null);
    const req = mockRequest(`/api/chat/${FRIEND_ID}`, {
      body: { type: "text", content: "hello" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(FRIEND_ID))
    );
    expect(status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 403 when users are not friends", async () => {
    friendRequestsCol.findOne.mockResolvedValue(null);

    const req = mockRequest(`/api/chat/${STRANGER_ID}`, {
      body: { type: "text", content: "hello" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(STRANGER_ID))
    );
    expect(status).toBe(403);
    expect(json.error).toBe("You can only message friends");
  });

  it("returns 400 when friend id is malformed", async () => {
    const req = mockRequest("/api/chat/not-an-id", {
      body: { type: "text", content: "hello" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams("not-an-id"))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Invalid friend id");
  });

  it("returns 400 when type is missing", async () => {
    const req = mockRequest(`/api/chat/${FRIEND_ID}`, {
      body: { content: "hello" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(FRIEND_ID))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Missing type");
  });

  it("returns 400 for empty text content", async () => {
    const req = mockRequest(`/api/chat/${FRIEND_ID}`, {
      body: { type: "text", content: "   " },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(FRIEND_ID))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Empty content");
  });

  it("successfully sends a text message", async () => {
    const insertedId = new ObjectId();
    messagesCol.insertOne.mockResolvedValue({ insertedId });

    const req = mockRequest(`/api/chat/${FRIEND_ID}`, {
      body: { type: "text", content: "Hello friend!" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(FRIEND_ID))
    );
    expect(status).toBe(200);
    expect(json.id).toBe(String(insertedId));

    // Verify the message was inserted with correct fields
    const insertCall = messagesCol.insertOne.mock.calls[0][0];
    expect(insertCall.from_user_id).toBe(CURRENT_USER);
    expect(insertCall.to_user_id).toBe(FRIEND_ID);
    expect(insertCall.type).toBe("text");
    expect(insertCall.content).toBe("Hello friend!");
  });

  it("verifies friendship check queries both directions", async () => {
    const req = mockRequest(`/api/chat/${FRIEND_ID}`, {
      body: { type: "text", content: "hi" },
    });
    await POST(req, makeParams(FRIEND_ID));

    // areFriends() queries friend_requests with both directions in $or.
    const query = friendRequestsCol.findOne.mock.calls[0][0];
    expect(query.$or).toEqual([
      { from_user_id: CURRENT_USER, to_user_id: FRIEND_ID, status: "accepted" },
      { from_user_id: FRIEND_ID, to_user_id: CURRENT_USER, status: "accepted" },
    ]);
  });

  it("returns 400 for session-request with missing start", async () => {
    const req = mockRequest(`/api/chat/${FRIEND_ID}`, {
      body: { type: "session-request", durationMin: 25 },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(FRIEND_ID))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Missing start or durationMin");
  });

  it("returns 409 for duplicate pending session request slots", async () => {
    sessionRequestsCol.findOne.mockResolvedValue({
      _id: new ObjectId(),
      from_user_id: CURRENT_USER,
      to_user_id: FRIEND_ID,
      status: "pending",
    });
    const start = alignedFutureIso();

    const req = mockRequest(`/api/chat/${FRIEND_ID}`, {
      body: { type: "session-request", start, durationMin: 25 },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(FRIEND_ID))
    );
    expect(status).toBe(409);
    expect(json.error).toBe("A pending request for this slot already exists");
    expect(sessionRequestsCol.insertOne).not.toHaveBeenCalled();
    expect(messagesCol.insertOne).not.toHaveBeenCalled();
  });

  it("returns 400 for unsupported message type", async () => {
    const req = mockRequest(`/api/chat/${FRIEND_ID}`, {
      body: { type: "video" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(FRIEND_ID))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Unsupported type");
  });
});
