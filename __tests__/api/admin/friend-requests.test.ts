import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb, parseResponse } from "../../helpers";

function fluentFind(rows: unknown[] = []) {
  const cursor: Record<string, unknown> = {};
  cursor.sort = vi.fn(() => cursor);
  cursor.limit = vi.fn(() => cursor);
  cursor.toArray = vi.fn().mockResolvedValue(rows);
  return cursor;
}

const requestsCol = mockCollection();
const usersCol = mockCollection();
const db = mockDb({ friend_requests: requestsCol, users: usersCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
  isUserAdmin: vi.fn(),
  ADMIN_ROLE: "admin",
}));

import { requireAdmin } from "@/lib/admin";
import { GET } from "@/app/api/admin/friend-requests/route";

describe("GET /api/admin/friend-requests", () => {
  const fromId = String(new ObjectId());
  const toId = String(new ObjectId());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      admin: { userId: String(new ObjectId()), email: "admin@example.com" },
    });
    requestsCol.countDocuments.mockResolvedValue(1);
    requestsCol.find.mockReturnValue(
      fluentFind([
        {
          _id: new ObjectId(),
          from_user_id: fromId,
          to_user_id: toId,
          status: "pending",
          created_at: new Date("2026-08-17T08:00:00.000Z"),
        },
      ]),
    );
    usersCol.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: new ObjectId(fromId),
          firstname: "Ada",
          lastname: "Lovelace",
          username: "ada",
          email: "ada@example.com",
        },
        {
          _id: new ObjectId(toId),
          name: "Alan Turing",
          username: "alan",
          email: "alan@example.com",
        },
      ]),
    });
  });

  it("returns pending requests with from and to labels", async () => {
    const { status, json } = await parseResponse(
      await GET(new Request("http://localhost/api/admin/friend-requests")),
    );
    expect(status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.requests[0].summary).toBe("Ada Lovelace → Alan Turing");
    expect(json.requests[0].from.username).toBe("ada");
    expect(json.requests[0].to.username).toBe("alan");
  });
});
