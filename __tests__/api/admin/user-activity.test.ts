import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb, parseResponse } from "../../helpers";

function fluentFind(rows: unknown[] = []) {
  const cursor: Record<string, unknown> = {};
  cursor.sort = vi.fn(() => cursor);
  cursor.limit = vi.fn(() => cursor);
  cursor.skip = vi.fn(() => cursor);
  cursor.project = vi.fn(() => cursor);
  cursor.toArray = vi.fn().mockResolvedValue(rows);
  return cursor;
}

const usersCol = mockCollection();
const loginEventsCol = mockCollection();
const sessionsCol = mockCollection();
const friendRequestsCol = mockCollection();
const sessionRequestsCol = mockCollection();
const postsCol = mockCollection();
const commentsCol = mockCollection();
const reportsCol = mockCollection();
const auditCol = mockCollection();
const ipActivityCol = mockCollection();

const db = mockDb({
  users: usersCol,
  user_login_events: loginEventsCol,
  sessions: sessionsCol,
  friend_requests: friendRequestsCol,
  session_requests: sessionRequestsCol,
  community_posts: postsCol,
  community_comments: commentsCol,
  content_reports: reportsCol,
  admin_audit_log: auditCol,
  banned_ip_activity: ipActivityCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
  isUserAdmin: vi.fn(),
  ADMIN_ROLE: "admin",
}));

import { requireAdmin } from "@/lib/admin";
import { GET } from "@/app/api/admin/users/[userId]/activity/route";

describe("GET /api/admin/users/[userId]/activity", () => {
  const userId = String(new ObjectId());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      admin: { userId: String(new ObjectId()), email: "admin@example.com" },
    });
    usersCol.findOne.mockResolvedValue({
      _id: new ObjectId(userId),
      email: "user@example.com",
      username: "user",
      name: "Test User",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      signupIp: "203.0.113.10",
      lastLoginIp: "203.0.113.11",
      lastLoginAt: new Date("2026-08-01T12:00:00.000Z"),
      knownIps: [
        {
          ip: "203.0.113.11",
          firstSeenAt: new Date("2026-08-01T12:00:00.000Z"),
          lastSeenAt: new Date("2026-08-01T12:00:00.000Z"),
          count: 2,
        },
      ],
    });
    loginEventsCol.find.mockReturnValue(
      fluentFind([
        {
          userId,
          ip: "203.0.113.11",
          at: new Date("2026-08-01T12:00:00.000Z"),
          method: "credentials",
        },
      ]),
    );
    sessionsCol.find
      .mockReturnValueOnce(
        fluentFind([
          {
            start_time: new Date("2026-07-01T10:00:00.000Z"),
            duration_min: 50,
            session_type: "focus",
          },
        ]),
      )
      .mockReturnValueOnce(fluentFind([]));
    friendRequestsCol.find.mockReturnValue(fluentFind([]));
    sessionRequestsCol.find.mockReturnValue(fluentFind([]));
    postsCol.find.mockReturnValue(
      fluentFind([
        {
          content: "Hello community",
          createdAt: new Date("2026-06-01T09:00:00.000Z"),
        },
      ]),
    );
    commentsCol.find.mockReturnValue(fluentFind([]));
    reportsCol.find.mockReturnValue(fluentFind([]));
    auditCol.find.mockReturnValue(
      fluentFind([
        { action: "user.ban", createdAt: new Date("2026-08-10T00:00:00.000Z") },
      ]),
    );
    ipActivityCol.find.mockReturnValue(fluentFind([]));
  });

  it("returns a mixed timeline for a fixture user", async () => {
    const { status, json } = await parseResponse(
      await GET(new Request("http://localhost/api/admin/users/x/activity"), {
        params: Promise.resolve({ userId }),
      }),
    );

    expect(status).toBe(200);
    expect(json.user.email).toBe("user@example.com");
    expect(json.user.signupIp).toBe("203.0.113.10");
    expect(json.user.knownIps.map((row: { ip: string }) => row.ip)).toEqual(
      expect.arrayContaining(["203.0.113.10", "203.0.113.11"]),
    );
    const types = json.events.map((e: { type: string }) => e.type);
    expect(types).toContain("signup");
    expect(types).toContain("login");
    expect(types).toContain("session_created");
    expect(types).toContain("post");
    expect(types).toContain("moderation");
    expect(json.events[0].at >= json.events[json.events.length - 1].at).toBe(
      true,
    );
  });
});
