import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { mockRequest, parseResponse } from "../../helpers";

const listEngagementCrew = vi.hoisted(() => vi.fn());
const addEngagementCrewMember = vi.hoisted(() => vi.fn());
const removeEngagementCrewMember = vi.hoisted(() => vi.fn());
const logAdminAction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/adminAudit", () => ({
  logAdminAction,
}));

vi.mock("@/lib/engagementCrew", () => ({
  listEngagementCrew,
  addEngagementCrewMember,
  removeEngagementCrewMember,
}));

import { requireAdmin } from "@/lib/admin";
import { GET, POST, DELETE } from "@/app/api/admin/crew/route";

describe("/api/admin/crew", () => {
  const adminId = String(new ObjectId());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      admin: { userId: adminId, email: "admin@example.com" },
    });
    listEngagementCrew.mockResolvedValue([]);
    logAdminAction.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admins", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const req = mockRequest("/api/admin/crew", { method: "GET" });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(403);
  });

  it("lists crew and public /crew url", async () => {
    listEngagementCrew.mockResolvedValue([
      {
        email: "a@example.com",
        canonicalEmail: "a@example.com",
        userId: "u1",
        name: "A",
        addedAt: new Date().toISOString(),
      },
    ]);
    const req = mockRequest("/api/admin/crew", { method: "GET" });
    const { status, json } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(json.members).toHaveLength(1);
    expect(json.publicUrl).toBe("http://localhost:3000/crew");
  });

  it("adds a crew member and audits", async () => {
    addEngagementCrewMember.mockResolvedValue({
      ok: true,
      member: {
        email: "hire@example.com",
        canonicalEmail: "hire@example.com",
        userId: "u1",
        name: "Hire",
        addedAt: new Date().toISOString(),
      },
    });
    const req = mockRequest("/api/admin/crew", {
      method: "POST",
      body: { email: "hire@example.com" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crew.add" }),
    );
  });

  it("returns add errors", async () => {
    addEngagementCrewMember.mockResolvedValue({
      ok: false,
      error: "Already on crew",
      status: 409,
    });
    const req = mockRequest("/api/admin/crew", {
      method: "POST",
      body: { email: "hire@example.com" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(409);
    expect(json.error).toBe("Already on crew");
  });

  it("removes a crew member and audits", async () => {
    removeEngagementCrewMember.mockResolvedValue({ ok: true });
    const req = mockRequest("/api/admin/crew", {
      method: "DELETE",
      body: { email: "hire@example.com" },
    });
    const { status, json } = await parseResponse(await DELETE(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crew.remove" }),
    );
  });
});
