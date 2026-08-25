import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { mockRequest, parseResponse } from "../../helpers";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listDailyAccountsPublic: vi.fn(),
  listDailyAccounts: vi.fn(),
  getStoredDailyActiveId: vi.fn(),
  setDailyActiveId: vi.fn(),
  logAdminAction: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/dailyAccounts", () => ({
  listDailyAccountsPublic: mocks.listDailyAccountsPublic,
  listDailyAccounts: mocks.listDailyAccounts,
  getStoredDailyActiveId: mocks.getStoredDailyActiveId,
  setDailyActiveId: mocks.setDailyActiveId,
}));

vi.mock("@/lib/adminAudit", () => ({
  logAdminAction: mocks.logAdminAction,
}));

import { GET, PATCH } from "@/app/api/admin/daily/route";

const ACCOUNTS = [
  { id: "1", domain: "refocus-hq.daily.co", keyHint: "…2b5d", apiKey: "key-one-xxxx2b5d" },
  { id: "2", domain: "refocus-vc.daily.co", keyHint: "…6e02", apiKey: "key-two-xxxx6e02" },
];

describe("/api/admin/daily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      ok: true,
      admin: { userId: "admin-1", email: "admin@example.com" },
    });
    mocks.listDailyAccountsPublic.mockReturnValue(
      ACCOUNTS.map(({ id, domain, keyHint }) => ({ id, domain, keyHint })),
    );
    mocks.listDailyAccounts.mockReturnValue(ACCOUNTS);
    mocks.getStoredDailyActiveId.mockResolvedValue(null);
    mocks.setDailyActiveId.mockResolvedValue({
      previousId: "1",
      account: ACCOUNTS[1],
    });
    mocks.logAdminAction.mockResolvedValue(undefined);
  });

  it("GET returns 401/403 when requireAdmin fails", async () => {
    mocks.requireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const { status, json } = await parseResponse(await GET());
    expect(status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("GET lists accounts and defaults activeId to first", async () => {
    const { status, json } = await parseResponse(await GET());
    expect(status).toBe(200);
    expect(json.accounts).toEqual([
      { id: "1", domain: "refocus-hq.daily.co", keyHint: "…2b5d" },
      { id: "2", domain: "refocus-vc.daily.co", keyHint: "…6e02" },
    ]);
    expect(json.activeId).toBe("1");
  });

  it("GET uses stored activeId when valid", async () => {
    mocks.getStoredDailyActiveId.mockResolvedValue("2");
    const { status, json } = await parseResponse(await GET());
    expect(status).toBe(200);
    expect(json.activeId).toBe("2");
  });

  it("PATCH rejects unknown activeId", async () => {
    const req = mockRequest("/api/admin/daily", {
      method: "PATCH",
      body: { activeId: "99" },
    });
    const { status, json } = await parseResponse(await PATCH(req));
    expect(status).toBe(400);
    expect(json.error).toBe("Unknown Daily account id");
    expect(mocks.setDailyActiveId).not.toHaveBeenCalled();
  });

  it("PATCH switches account and audits", async () => {
    const req = mockRequest("/api/admin/daily", {
      method: "PATCH",
      body: { activeId: "2" },
    });
    const { status, json } = await parseResponse(await PATCH(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.activeId).toBe("2");
    expect(mocks.setDailyActiveId).toHaveBeenCalledWith("2", "admin-1");
    expect(mocks.logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "daily.switch_account",
        details: expect.objectContaining({
          toId: "2",
          toDomain: "refocus-vc.daily.co",
        }),
      }),
    );
  });
});
