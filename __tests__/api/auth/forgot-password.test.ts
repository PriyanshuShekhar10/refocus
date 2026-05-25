import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse, mockCollection, mockDb } from "../../helpers";
import { ObjectId } from "mongodb";

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
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

const usersCol = mockCollection();
const db = mockDb({ users: usersCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/email/sendPasswordResetEmail", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

import { POST } from "@/app/api/auth/forgot-password/route";
import { sendPasswordResetEmail } from "@/lib/email/sendPasswordResetEmail";

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersCol.findOne.mockResolvedValue(null);
  });

  it("returns 400 when email is missing", async () => {
    const req = mockRequest("/api/auth/forgot-password", { body: {} });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toBe("Email is required");
  });

  it("returns ok even when user does not exist", async () => {
    const req = mockRequest("/api/auth/forgot-password", {
      body: { email: "missing@example.com" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("sends reset email when user has a password", async () => {
    const userId = new ObjectId();
    usersCol.findOne.mockResolvedValue({
      _id: userId,
      email: "user@example.com",
      firstname: "Ada",
      hashedPassword: "hash",
    });

    const req = mockRequest("/api/auth/forgot-password", {
      body: { email: "user@example.com" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({
      userId: String(userId),
      email: "user@example.com",
      firstName: "Ada",
    });
  });

  it("returns ok without email when user has no password", async () => {
    usersCol.findOne.mockResolvedValue({
      _id: new ObjectId(),
      email: "oauth@example.com",
      hashedPassword: null,
    });

    const req = mockRequest("/api/auth/forgot-password", {
      body: { email: "oauth@example.com" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
