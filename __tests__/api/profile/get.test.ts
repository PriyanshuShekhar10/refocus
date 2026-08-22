import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockCollection, mockDb, parseResponse } from "../../helpers";

const usersCol = mockCollection();
const db = mockDb({ users: usersCol });

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
    expect(json.adminView).toBeUndefined();
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
