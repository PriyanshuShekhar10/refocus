import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse } from "../../helpers";

const getCrewStats = vi.hoisted(() => vi.fn());
const requireCrewViewer = vi.hoisted(() => vi.fn());

vi.mock("@/lib/crewStats", () => ({
  getCrewStats,
}));

vi.mock("@/lib/crewAccess", () => ({
  requireCrewViewer,
}));

import { GET } from "@/app/api/crew/stats/route";

describe("/api/crew/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCrewViewer.mockResolvedValue({ ok: true, userId: "crew-user" });
    getCrewStats.mockResolvedValue({
      days: 14,
      timezone: "Asia/Kolkata",
      todayKey: "2026-08-21",
      fromKey: "2026-08-08",
      toKey: "2026-08-21",
      members: [],
    });
  });

  it("rejects signed-out viewers", async () => {
    requireCrewViewer.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    });
    const req = mockRequest("/api/crew/stats?days=30", { method: "GET" });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(401);
    expect(getCrewStats).not.toHaveBeenCalled();
  });

  it("returns stats for a crew viewer", async () => {
    const req = mockRequest("/api/crew/stats?days=30", { method: "GET" });
    const { status, json } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(json.members).toEqual([]);
    expect(getCrewStats).toHaveBeenCalledWith(30);
  });

  it("defaults days when omitted", async () => {
    const req = mockRequest("/api/crew/stats", { method: "GET" });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(getCrewStats).toHaveBeenCalledWith(30);
  });

  it("maps all to the all-time lookback", async () => {
    const req = mockRequest("/api/crew/stats?days=all", { method: "GET" });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(getCrewStats).toHaveBeenCalledWith(365);
  });

  it("rejects invalid days", async () => {
    const req = mockRequest("/api/crew/stats?days=nope", { method: "GET" });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(400);
  });
});
