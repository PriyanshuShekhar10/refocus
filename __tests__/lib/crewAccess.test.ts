import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const isUserAdmin = vi.hoisted(() => vi.fn());
const isEngagementCrewUserId = vi.hoisted(() => vi.fn());
const getServerSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin", () => ({
  isUserAdmin,
}));

vi.mock("@/lib/engagementCrew", () => ({
  isEngagementCrewUserId,
}));

vi.mock("next-auth", () => ({
  getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { canViewCrewBoard, requireCrewViewer } from "@/lib/crewAccess";

describe("canViewCrewBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isUserAdmin.mockResolvedValue(false);
    isEngagementCrewUserId.mockResolvedValue(false);
  });

  it("allows an admin who is not on the crew", async () => {
    isUserAdmin.mockResolvedValue(true);
    await expect(canViewCrewBoard("admin-id")).resolves.toBe(true);
  });

  it("allows a crew member who is not an admin", async () => {
    isEngagementCrewUserId.mockResolvedValue(true);
    await expect(canViewCrewBoard("crew-id")).resolves.toBe(true);
  });

  it("blocks everyone else", async () => {
    await expect(canViewCrewBoard("user-id")).resolves.toBe(false);
    await expect(canViewCrewBoard(null)).resolves.toBe(false);
  });
});

describe("requireCrewViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isUserAdmin.mockResolvedValue(false);
    isEngagementCrewUserId.mockResolvedValue(false);
  });

  it("returns 401 when signed out", async () => {
    getServerSession.mockResolvedValue(null);
    const result = await requireCrewViewer();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 for a signed-in user outside the crew", async () => {
    getServerSession.mockResolvedValue({ user: { id: "user-id" } });
    const result = await requireCrewViewer();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response).toBeInstanceOf(NextResponse);
      expect(result.response.status).toBe(403);
    }
  });

  it("allows a signed-in crew member", async () => {
    getServerSession.mockResolvedValue({ user: { id: "crew-id" } });
    isEngagementCrewUserId.mockResolvedValue(true);
    const result = await requireCrewViewer();
    expect(result).toEqual({ ok: true, userId: "crew-id" });
  });
});
