import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../../helpers";
import { ObjectId } from "mongodb";

const friendRequestsCol = mockCollection();
const db = mockDb({ friend_requests: friendRequestsCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { POST } from "@/app/api/friends/requests/[id]/route";

const USER_ID = "user123";
const REQUEST_ID = new ObjectId();

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/friends/requests/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ID);
  });

  it("returns 401 when not authenticated", async () => {
    mockSession(null);
    const req = mockRequest(`/api/friends/requests/${REQUEST_ID}`, {
      body: { action: "accept" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID)))
    );
    expect(status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 when action is missing", async () => {
    const req = mockRequest(`/api/friends/requests/${REQUEST_ID}`, {
      body: {},
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID)))
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Missing action");
  });

  it("returns 404 when request does not exist", async () => {
    friendRequestsCol.findOneAndUpdate.mockResolvedValue(null);
    friendRequestsCol.findOne.mockResolvedValue(null);

    const req = mockRequest(`/api/friends/requests/${REQUEST_ID}`, {
      body: { action: "accept" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID)))
    );
    expect(status).toBe(404);
    expect(json.error).toBe("Not found");
  });

  it("returns 403 when request belongs to a different user", async () => {
    friendRequestsCol.findOneAndUpdate.mockResolvedValue(null);
    friendRequestsCol.findOne.mockResolvedValue({
      _id: REQUEST_ID,
      to_user_id: "someone_else",
      status: "pending",
    });

    const req = mockRequest(`/api/friends/requests/${REQUEST_ID}`, {
      body: { action: "accept" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID)))
    );
    expect(status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("returns 409 when request was already responded to", async () => {
    friendRequestsCol.findOneAndUpdate.mockResolvedValue(null);
    friendRequestsCol.findOne.mockResolvedValue({
      _id: REQUEST_ID,
      to_user_id: USER_ID,
      status: "accepted",
    });

    const req = mockRequest(`/api/friends/requests/${REQUEST_ID}`, {
      body: { action: "accept" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID)))
    );
    expect(status).toBe(409);
    expect(json.error).toBe("Request already responded to");
  });

  it("successfully accepts a pending request atomically", async () => {
    friendRequestsCol.findOneAndUpdate.mockResolvedValue({
      _id: REQUEST_ID,
      to_user_id: USER_ID,
      status: "accepted",
      responded_at: new Date(),
    });

    const req = mockRequest(`/api/friends/requests/${REQUEST_ID}`, {
      body: { action: "accept" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID)))
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);

    // Verify the atomic query includes status: "pending"
    const [filter, update] = friendRequestsCol.findOneAndUpdate.mock.calls[0];
    expect(filter.status).toBe("pending");
    expect(filter.to_user_id).toBe(USER_ID);
    expect(update.$set.status).toBe("accepted");
  });

  it("successfully declines a pending request", async () => {
    friendRequestsCol.findOneAndUpdate.mockResolvedValue({
      _id: REQUEST_ID,
      to_user_id: USER_ID,
      status: "declined",
    });

    const req = mockRequest(`/api/friends/requests/${REQUEST_ID}`, {
      body: { action: "decline" },
    });
    const { status, json } = await parseResponse(
      await POST(req, makeParams(String(REQUEST_ID)))
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);

    const [, update] = friendRequestsCol.findOneAndUpdate.mock.calls[0];
    expect(update.$set.status).toBe("declined");
  });
});
