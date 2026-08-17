import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb, mockRequest, parseResponse } from "../../helpers";

const settingsCol = mockCollection();
const db = mockDb({ app_settings: settingsCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
  isUserAdmin: vi.fn(),
  ADMIN_ROLE: "admin",
}));

vi.mock("@/lib/email/opsNotify", () => ({
  OPS_NOTIFY_EMAIL: "priyanshushekhar100@gmail.com",
}));

import { requireAdmin } from "@/lib/admin";
import { GET, PATCH } from "@/app/api/admin/ops-notify/route";

describe("/api/admin/ops-notify", () => {
  const adminId = String(new ObjectId());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      admin: { userId: adminId, email: "admin@example.com" },
    });
    settingsCol.findOne.mockResolvedValue(null);
    settingsCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("returns defaults for admins", async () => {
    const { status, json } = await parseResponse(await GET());
    expect(status).toBe(200);
    expect(json.signup).toBe(true);
    expect(json.sessionMatched).toBe(true);
    expect(json.email).toBe("priyanshushekhar100@gmail.com");
  });

  it("rejects non-admins", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      }) as never,
    });
    const { status } = await parseResponse(await GET());
    expect(status).toBe(403);
  });

  it("saves a toggle off", async () => {
    settingsCol.findOne.mockResolvedValue({
      key: "ops_notify",
      signup: false,
      sessionMatched: true,
    });
    const req = mockRequest("/api/admin/ops-notify", {
      method: "PATCH",
      body: { signup: false },
    });
    const { status, json } = await parseResponse(await PATCH(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.signup).toBe(false);
    expect(settingsCol.updateOne).toHaveBeenCalled();
  });
});
