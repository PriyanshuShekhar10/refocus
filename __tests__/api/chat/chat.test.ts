import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../../helpers";
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
const db = mockDb({
  messages: messagesCol,
  friend_requests: friendRequestsCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { POST } from "@/app/api/chat/[friendId]/route";

const CURRENT_USER = "user123";
const FRIEND_ID = "friend456";

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
  });

  it("returns 401 when not authenticated", async () => {
    mockSession(null);
    const req = mockRequest("/api/chat/friend456", {
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

    const req = mockRequest("/api/chat/stranger789", {
      body: { type: "text", content: "hello" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams("stranger789"))
    );
    expect(status).toBe(403);
    expect(json.error).toBe("You can only message friends");
  });

  it("returns 400 when type is missing", async () => {
    const req = mockRequest("/api/chat/friend456", {
      body: { content: "hello" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(FRIEND_ID))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Missing type");
  });

  it("returns 400 for empty text content", async () => {
    const req = mockRequest("/api/chat/friend456", {
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

    const req = mockRequest("/api/chat/friend456", {
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
    const req = mockRequest("/api/chat/friend456", {
      body: { type: "text", content: "hi" },
    });
    await POST(req, makeParams(FRIEND_ID));

    const query = friendRequestsCol.findOne.mock.calls[0][0];
    expect(query.status).toBe("accepted");
    expect(query.$or).toEqual([
      { from_user_id: CURRENT_USER, to_user_id: FRIEND_ID },
      { from_user_id: FRIEND_ID, to_user_id: CURRENT_USER },
    ]);
  });

  it("returns 400 for session-request with missing start", async () => {
    const req = mockRequest("/api/chat/friend456", {
      body: { type: "session-request", durationMin: 25 },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(FRIEND_ID))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Missing start or durationMin");
  });

  it("returns 400 for unsupported message type", async () => {
    const req = mockRequest("/api/chat/friend456", {
      body: { type: "video" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(FRIEND_ID))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Unsupported type");
  });
});
