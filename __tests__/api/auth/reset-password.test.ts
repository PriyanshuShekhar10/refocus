import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "../../helpers";

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

vi.mock("@/lib/passwordReset", () => ({
  isPasswordResetTokenValid: vi.fn(),
  resetPasswordWithToken: vi.fn(),
}));

import { GET, POST } from "@/app/api/auth/reset-password/route";
import {
  isPasswordResetTokenValid,
  resetPasswordWithToken,
} from "@/lib/passwordReset";

describe("GET /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns valid:false when token is missing", async () => {
    const req = mockRequest("/api/auth/reset-password");
    const { status, json } = await parseResponse(await GET(req));
    expect(status).toBe(400);
    expect(json.valid).toBe(false);
  });

  it("returns token validity", async () => {
    vi.mocked(isPasswordResetTokenValid).mockResolvedValue(true);
    const req = mockRequest("/api/auth/reset-password?token=abc");
    const { status, json } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(json.valid).toBe(true);
    expect(isPasswordResetTokenValid).toHaveBeenCalledWith("abc");
  });
});

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when token or password is missing", async () => {
    const req = mockRequest("/api/auth/reset-password", {
      method: "POST",
      body: { token: "abc" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toBe("Token and password are required");
  });

  it("resets password on success", async () => {
    vi.mocked(resetPasswordWithToken).mockResolvedValue({ ok: true });

    const req = mockRequest("/api/auth/reset-password", {
      method: "POST",
      body: { token: "abc", password: "StrongP@ss1" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(resetPasswordWithToken).toHaveBeenCalledWith("abc", "StrongP@ss1");
  });

  it("returns 400 for weak password", async () => {
    vi.mocked(resetPasswordWithToken).mockResolvedValue({
      ok: false,
      error: "Password is too weak",
      requirements: [],
    });

    const req = mockRequest("/api/auth/reset-password", {
      method: "POST",
      body: { token: "abc", password: "weak" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toBe("Password is too weak");
  });
});
