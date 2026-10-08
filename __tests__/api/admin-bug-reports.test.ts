import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { mockRequest, parseResponse, mockCollection, mockDb } from "../helpers";

const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin", () => ({ requireAdmin }));
const logAdminAction = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction }));

const bugReports = mockCollection();
const db = mockDb({ bug_reports: bugReports });
vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn().mockImplementation(() => Promise.resolve(db)) }));

import { PATCH } from "@/app/api/admin/bug-reports/[id]/route";

const ID = new ObjectId();
const patch = (status: unknown) =>
  PATCH(mockRequest(`/api/admin/bug-reports/${ID}`, { method: "PATCH", body: { status } }), {
    params: Promise.resolve({ id: String(ID) }),
  });

describe("PATCH /api/admin/bug-reports/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ ok: true, admin: { userId: "a1", email: "admin@example.com" } });
    bugReports.findOneAndUpdate.mockResolvedValue({ _id: ID, status: "resolved", description: "Broken", userId: "u1" });
  });

  it("is admin-only", async () => {
    requireAdmin.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) });
    const { status } = await parseResponse(await patch("resolved"));
    expect(status).toBe(403);
    expect(bugReports.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects unknown statuses", async () => {
    const { status } = await parseResponse(await patch("done"));
    expect(status).toBe(400);
  });

  it("resolves a report and logs it", async () => {
    const { status, json } = await parseResponse(await patch("resolved"));
    expect(status).toBe(200);
    expect(json.status).toBe("resolved");
    expect(bugReports.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: ID },
      { $set: expect.objectContaining({ status: "resolved", resolvedBy: "admin@example.com" }) },
      { returnDocument: "after" },
    );
    expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: "bug.resolve" }));
  });
});
