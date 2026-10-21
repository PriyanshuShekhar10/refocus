import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { mockCollection, mockDb, mockRequest, parseResponse } from "../../helpers";

const users = mockCollection();
const aggregate = vi.fn();
const messages = mockCollection({ aggregate });
const audit = mockCollection();
const db = mockDb({ users, messages, admin_audit_log: audit });
vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn().mockImplementation(() => Promise.resolve(db)) }));

import { GET as listRoute } from "@/app/api/admin/conversations/route";
import { GET as threadRoute } from "@/app/api/admin/conversations/[userA]/[userB]/route";

const ADMIN = "aaaaaaaaaaaaaaaaaaaaaaaa";
const A = "bbbbbbbbbbbbbbbbbbbbbbbb";
const B = "cccccccccccccccccccccccc";

function asAdmin() {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: ADMIN, email: "admin@example.com" } } as never);
  users.findOne.mockResolvedValue({ role: "admin" });
}

function cursor(rows: unknown[]) {
  const c = {
    sort: vi.fn(() => c),
    limit: vi.fn(() => c),
    project: vi.fn(() => c),
    toArray: vi.fn().mockResolvedValue(rows),
  };
  return c;
}

describe("admin conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asAdmin();
    users.find.mockReturnValue(
      cursor([
        { _id: new ObjectId(A), email: "a@example.com", username: "anna", firstname: "Anna" },
        { _id: new ObjectId(B), email: "b@example.com", username: "ben", name: "Ben K" },
      ]),
    );
  });

  it("lists conversations with both people and a preview", async () => {
    aggregate.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: { a: A, b: B },
          messageCount: 3,
          textCount: 2,
          firstAt: new Date("2026-10-01T10:00:00Z"),
          lastAt: new Date("2026-10-02T10:00:00Z"),
          lastText: { content: "see you at 5", deleted: false },
        },
      ]),
    });
    const { status, json } = await parseResponse(await listRoute(mockRequest("/api/admin/conversations", { method: "GET" })));
    expect(status).toBe(200);
    expect(json.conversations).toHaveLength(1);
    expect(json.conversations[0]).toMatchObject({
      messageCount: 3,
      lastPreview: "see you at 5",
      users: [{ id: A, name: "Anna" }, { id: B, name: "Ben K" }],
    });
  });

  it("returns nothing when a search matches no users", async () => {
    users.find.mockReturnValue(cursor([]));
    const { json } = await parseResponse(await listRoute(mockRequest("/api/admin/conversations?q=nobody", { method: "GET" })));
    expect(json.conversations).toEqual([]);
    expect(aggregate).not.toHaveBeenCalled();
  });

  it("returns the thread oldest first and records the view in the audit log", async () => {
    messages.find.mockReturnValue(
      cursor([
        { _id: new ObjectId(), from_user_id: A, to_user_id: B, type: "text", content: "hi", created_at: new Date("2026-10-01T10:00:00Z"), read_at: null, deleted: false },
        { _id: new ObjectId(), from_user_id: B, to_user_id: A, type: "text", content: "gone", created_at: new Date("2026-10-01T10:01:00Z"), read_at: null, deleted: true },
      ]),
    );
    const { status, json } = await parseResponse(
      await threadRoute(mockRequest(`/api/admin/conversations/${A}/${B}`, { method: "GET" }), { params: Promise.resolve({ userA: A, userB: B }) }),
    );
    expect(status).toBe(200);
    expect(json.messages.map((m: { content: string; deleted: boolean }) => [m.content, m.deleted])).toEqual([["hi", false], ["gone", true]]);
    expect(messages.find).toHaveBeenCalledWith({
      $or: [
        { from_user_id: A, to_user_id: B },
        { from_user_id: B, to_user_id: A },
      ],
    });
    expect(audit.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ADMIN,
        action: "messages.view_conversation",
        targetUserId: A,
        resourceId: `${A}:${B}`,
        details: { otherUserId: B, messageCount: 2 },
      }),
    );
  });

  it("rejects bad or identical user ids without logging", async () => {
    for (const [userA, userB] of [["nope", B], [A, A]]) {
      const { status } = await parseResponse(
        await threadRoute(mockRequest(`/api/admin/conversations/${userA}/${userB}`, { method: "GET" }), { params: Promise.resolve({ userA, userB }) }),
      );
      expect(status).toBe(400);
    }
    expect(audit.insertOne).not.toHaveBeenCalled();
  });
});
