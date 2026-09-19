import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockCollection, mockDb, parseResponse } from "../../helpers";

const usersCol = mockCollection();
const sessionsCol = mockCollection();
const db = mockDb({ users: usersCol, sessions: sessionsCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/admin", () => ({
  isUserAdmin: vi.fn(),
  ADMIN_ROLE: "admin",
}));

vi.mock("@/lib/emailVerification", () => ({
  isEmailVerified: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/userAvatar", () => ({
  resolveAvatarUrl: vi.fn().mockReturnValue(null),
}));

import { getServerSession } from "next-auth";
import { isUserAdmin } from "@/lib/admin";
import { GET } from "@/app/api/profile/[username]/route";

function makeReq() {
  return new NextRequest("http://localhost/api/profile/alice");
}

describe("GET /api/profile/[username]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(isUserAdmin).mockResolvedValue(false);
    sessionsCol.find.mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      toArray: vi.fn().mockResolvedValue([]),
    });
  });

  it("returns public profile", async () => {
    usersCol.findOne.mockResolvedValue({
      username: "alice",
      name: "Alice",
      preferences: { publicProfile: true },
      interests: [],
    });

    const { status, json } = await parseResponse(
      await GET(makeReq(), { params: Promise.resolve({ username: "alice" }) }),
    );
    expect(status).toBe(200);
    expect(json.user.username).toBe("alice");
    expect(json.user.attendance).toBeNull();
    expect(json.adminView).toBeUndefined();
  });

  it("includes partner-session attendance percent", async () => {
    usersCol.findOne.mockResolvedValue({
      _id: "user-a",
      username: "alice",
      name: "Alice",
      preferences: { publicProfile: true },
      interests: [],
    });
    sessionsCol.find.mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            owner_id: "user-a",
            session_participants: [
              { user_id: "user-a", call_joined_at: new Date() },
              { user_id: "user-b", call_joined_at: new Date() },
            ],
          },
          {
            owner_id: "user-a",
            session_participants: [
              { user_id: "user-a" },
              { user_id: "user-c" },
            ],
          },
        ]),
      }),
    });

    const { status, json } = await parseResponse(
      await GET(makeReq(), { params: Promise.resolve({ username: "alice" }) }),
    );
    expect(status).toBe(200);
    expect(json.user.attendance).toEqual({
      percent: 50,
      booked: 2,
      attended: 1,
    });
  });

  it("returns cached attendance without scanning sessions", async () => {
    const { ObjectId } = await import("mongodb");
    usersCol.findOne.mockResolvedValue({
      _id: new ObjectId(),
      username: "alice",
      name: "Alice",
      preferences: { publicProfile: true },
      interests: [],
      publicAttendance: { percent: 80, booked: 10, attended: 8 },
      publicAttendanceAt: new Date(),
    });

    const { status, json } = await parseResponse(
      await GET(makeReq(), { params: Promise.resolve({ username: "alice" }) }),
    );
    expect(status).toBe(200);
    expect(json.user.attendance).toEqual({
      percent: 80,
      booked: 10,
      attended: 8,
    });
    expect(sessionsCol.find).not.toHaveBeenCalled();
  });

  it("counts attendance when participant user_id is an ObjectId", async () => {
    const { ObjectId } = await import("mongodb");
    const id = new ObjectId();
    usersCol.findOne.mockResolvedValue({
      _id: id,
      username: "alice",
      name: "Alice",
      preferences: { publicProfile: true },
      interests: [],
    });
    sessionsCol.find.mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            owner_id: id,
            session_participants: [
              { user_id: id, call_joined_at: new Date() },
              { user_id: "user-b", call_joined_at: new Date() },
            ],
          },
        ]),
      }),
    });

    const { status, json } = await parseResponse(
      await GET(makeReq(), { params: Promise.resolve({ username: "alice" }) }),
    );
    expect(status).toBe(200);
    expect(json.user.attendance).toEqual({
      percent: 100,
      booked: 1,
      attended: 1,
    });
  });

  it("hides private profile from non-admins", async () => {
    usersCol.findOne.mockResolvedValue({
      username: "alice",
      preferences: { publicProfile: false },
    });

    const { status, json } = await parseResponse(
      await GET(makeReq(), { params: Promise.resolve({ username: "alice" }) }),
    );
    expect(status).toBe(404);
    expect(json.error).toBe("User not found");
    expect(isUserAdmin).toHaveBeenCalled();
  });

  it("lets admins view private profiles", async () => {
    usersCol.findOne.mockResolvedValue({
      username: "alice",
      name: "Alice",
      preferences: { publicProfile: false },
      interests: ["focus"],
    });
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-id" },
    } as never);
    vi.mocked(isUserAdmin).mockResolvedValue(true);

    const { status, json } = await parseResponse(
      await GET(makeReq(), { params: Promise.resolve({ username: "alice" }) }),
    );
    expect(status).toBe(200);
    expect(json.user.username).toBe("alice");
    expect(json.adminView).toBe(true);
    expect(json.privateProfile).toBe(true);
  });
});
