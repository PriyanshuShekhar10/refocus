import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { mockRequest, parseResponse } from "../../helpers";

const createAdminTestCall = vi.hoisted(() => vi.fn());
const listActiveAdminTestCalls = vi.hoisted(() => vi.fn());
const logAdminAction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/adminAudit", () => ({
  logAdminAction,
}));

vi.mock("@/lib/adminTestCall", () => ({
  createAdminTestCall,
  listActiveAdminTestCalls,
  isValidAdminTestDuration: (value: unknown) =>
    typeof value === "number" && [25, 50, 75].includes(value),
}));

import { requireAdmin } from "@/lib/admin";
import { GET, POST } from "@/app/api/admin/test-call/route";

describe("/api/admin/test-call", () => {
  const adminId = String(new ObjectId());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      admin: { userId: adminId, email: "admin@example.com" },
    });
    logAdminAction.mockResolvedValue(undefined);
    listActiveAdminTestCalls.mockResolvedValue([]);
    createAdminTestCall.mockResolvedValue({
      sessionId: String(new ObjectId()),
      startTime: "2026-08-22T12:00:00.000Z",
      endTime: "2026-08-22T12:25:00.000Z",
      durationMin: 25,
      callPagePath: "/sessions/abc",
      roomName: "session-abc",
      domain: "refocus.daily.co",
      token: "daily-token",
    });
  });

  it("rejects non-admins on GET", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const { status } = await parseResponse(await GET());
    expect(status).toBe(403);
  });

  it("lists active admin test calls", async () => {
    listActiveAdminTestCalls.mockResolvedValue([
      {
        sessionId: "s1",
        startTime: "2026-08-22T12:00:00.000Z",
        endTime: "2026-08-22T12:25:00.000Z",
        durationMin: 25,
        callPagePath: "/sessions/s1",
        createdByUserId: adminId,
      },
    ]);
    const { status, json } = await parseResponse(await GET());
    expect(status).toBe(200);
    expect(json.sessions).toHaveLength(1);
    expect(json.sessions[0].callPagePath).toBe("/sessions/s1");
  });

  it("creates a test call and audits the action", async () => {
    const req = mockRequest("/api/admin/test-call", {
      method: "POST",
      body: { durationMin: 50 },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.durationMin).toBe(25);
    expect(createAdminTestCall).toHaveBeenCalledWith({
      adminUserId: adminId,
      adminName: "admin",
      durationMin: 50,
    });
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "test_call.create",
        actorId: adminId,
      }),
    );
  });

  it("rejects invalid duration", async () => {
    const req = mockRequest("/api/admin/test-call", {
      method: "POST",
      body: { durationMin: 99 },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toMatch(/Invalid durationMin/);
    expect(createAdminTestCall).not.toHaveBeenCalled();
  });
});
