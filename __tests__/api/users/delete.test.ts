import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import {
  mockRequest,
  parseResponse,
  mockCollection,
  mockDb,
  mockSession,
} from "../../helpers";

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 5,
    remaining: 4,
    reset: Date.now() + 60000,
  }),
  rateLimitedResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
  ),
}));

const userId = String(new ObjectId());
const usersCol = mockCollection();
const deletedCol = mockCollection();
const sessionsCol = mockCollection();
const db = mockDb({
  users: usersCol,
  deleted_users: deletedCol,
  sessions: sessionsCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { POST } from "@/app/api/users/me/delete/route";

describe("POST /api/users/me/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(userId);
    usersCol.findOne.mockResolvedValue({
      _id: new ObjectId(userId),
      email: "ada@example.com",
      username: "ada",
      firstname: "Ada",
      lastname: "Lovelace",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    usersCol.deleteOne.mockResolvedValue({ deletedCount: 1 });
    sessionsCol.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });
  });

  it("archives the profile before deleting the user", async () => {
    const { status, json } = await parseResponse(
      await POST(
        mockRequest("/api/users/me/delete", {
          body: { confirmText: "DELETE" },
        }),
      ),
    );

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(deletedCol.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        email: "ada@example.com",
        username: "ada",
        name: "Ada Lovelace",
      }),
    );
    expect(usersCol.deleteOne).toHaveBeenCalled();
  });

  it("does not delete the user if the archive write fails", async () => {
    deletedCol.insertOne.mockRejectedValue(new Error("write failed"));

    const { status } = await parseResponse(
      await POST(
        mockRequest("/api/users/me/delete", {
          body: { confirmText: "DELETE" },
        }),
      ),
    );

    expect(status).toBe(500);
    expect(usersCol.deleteOne).not.toHaveBeenCalled();
  });
});
