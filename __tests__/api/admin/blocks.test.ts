import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { mockCollection, mockDb, parseResponse } from "../../helpers";

function fluentFind(rows: unknown[] = []) {
  const cursor: Record<string, unknown> = {};
  cursor.sort = vi.fn(() => cursor);
  cursor.skip = vi.fn(() => cursor);
  cursor.limit = vi.fn(() => cursor);
  cursor.toArray = vi.fn().mockResolvedValue(rows);
  return cursor;
}

const blocksCol = mockCollection({
  distinct: vi.fn(),
});
const usersCol = mockCollection();
const db = mockDb({ user_blocks: blocksCol, users: usersCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
  isUserAdmin: vi.fn(),
  ADMIN_ROLE: "admin",
}));

import { requireAdmin } from "@/lib/admin";
import { GET } from "@/app/api/admin/blocks/route";

describe("GET /api/admin/blocks", () => {
  const blockerId = String(new ObjectId());
  const blockedId = String(new ObjectId());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      admin: { userId: String(new ObjectId()), email: "admin@example.com" },
    });
    blocksCol.countDocuments.mockResolvedValue(1);
    (blocksCol as { distinct: ReturnType<typeof vi.fn> }).distinct.mockResolvedValue(
      [blockerId],
    );
    blocksCol.find.mockReturnValue(
      fluentFind([
        {
          _id: new ObjectId(),
          blocker_id: blockerId,
          blocked_id: blockedId,
          created_at: new Date("2026-08-17T08:00:00.000Z"),
        },
      ]),
    );
    usersCol.find.mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([
        {
          _id: new ObjectId(blockerId),
          firstname: "Ada",
          lastname: "Lovelace",
          username: "ada",
          email: "ada@example.com",
        },
        {
          _id: new ObjectId(blockedId),
          name: "Alan Turing",
          username: "alan",
          email: "alan@example.com",
        },
      ]),
    });
  });

  it("returns 403 when requireAdmin fails", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const { status, json } = await parseResponse(
      await GET(new Request("http://localhost/api/admin/blocks")),
    );
    expect(status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("lists blocks with blocker and blocked labels", async () => {
    const { status, json } = await parseResponse(
      await GET(new Request("http://localhost/api/admin/blocks")),
    );
    expect(status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.uniqueBlockers).toBe(1);
    expect(json.blocks[0].summary).toBe("Ada Lovelace blocked Alan Turing");
    expect(json.blocks[0].blocker.username).toBe("ada");
    expect(json.blocks[0].blocked.username).toBe("alan");
    expect(json.blocks[0].createdAt).toBe("2026-08-17T08:00:00.000Z");
  });

  it("returns an empty list when search matches no users", async () => {
    usersCol.find.mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    });
    const { status, json } = await parseResponse(
      await GET(
        new Request("http://localhost/api/admin/blocks?q=nobody"),
      ),
    );
    expect(status).toBe(200);
    expect(json.total).toBe(0);
    expect(json.blocks).toEqual([]);
    expect(blocksCol.find).not.toHaveBeenCalled();
  });
});
