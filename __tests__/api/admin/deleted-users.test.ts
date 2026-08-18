import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb, parseResponse } from "../../helpers";

function fluentFind(rows: unknown[] = []) {
  const cursor: Record<string, unknown> = {};
  cursor.sort = vi.fn(() => cursor);
  cursor.skip = vi.fn(() => cursor);
  cursor.limit = vi.fn(() => cursor);
  cursor.toArray = vi.fn().mockResolvedValue(rows);
  return cursor;
}

const deletedCol = mockCollection();
const db = mockDb({ deleted_users: deletedCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
  isUserAdmin: vi.fn(),
  ADMIN_ROLE: "admin",
}));

import { requireAdmin } from "@/lib/admin";
import { GET } from "@/app/api/admin/deleted-users/route";

describe("GET /api/admin/deleted-users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      admin: { userId: String(new ObjectId()), email: "admin@example.com" },
    });
    deletedCol.countDocuments.mockResolvedValue(1);
    deletedCol.find.mockReturnValue(
      fluentFind([
        {
          _id: new ObjectId(),
          userId: String(new ObjectId()),
          email: "gone@example.com",
          username: "gone",
          name: "Gone User",
          emailVerified: true,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          deletedAt: new Date("2026-08-18T12:00:00.000Z"),
          lastLoginAt: new Date("2026-08-17T12:00:00.000Z"),
          signupIp: "203.0.113.9",
          lastLoginIp: "203.0.113.9",
          lastSeenIp: "203.0.113.9",
          knownIps: ["203.0.113.9"],
          wasAdmin: false,
          communityBanned: false,
          communityMuted: false,
        },
      ]),
    );
  });

  it("lists archived deleted profiles", async () => {
    const { status, json } = await parseResponse(
      await GET(new Request("http://localhost/api/admin/deleted-users")),
    );
    expect(status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.users[0].email).toBe("gone@example.com");
    expect(json.users[0].username).toBe("gone");
    expect(json.users[0].deletedAt).toBe("2026-08-18T12:00:00.000Z");
  });
});
