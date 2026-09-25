import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { mockRequest, parseResponse } from "../../helpers";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listDailyAccountsPublic: vi.fn(),
  listDailyAccounts: vi.fn(),
  getDailyAdminState: vi.fn(),
  setDailyActiveId: vi.fn(),
  setDailySelectionMode: vi.fn(),
  logAdminAction: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/dailyAccounts", () => ({
  listDailyAccountsPublic: mocks.listDailyAccountsPublic,
  listDailyAccounts: mocks.listDailyAccounts,
  getDailyAdminState: mocks.getDailyAdminState,
  setDailyActiveId: mocks.setDailyActiveId,
  setDailySelectionMode: mocks.setDailySelectionMode,
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
    mocks.getDailyAdminState.mockResolvedValue({
      selectionMode: "rotate",
      activeId: "1",
      nextId: "1",
    });
    mocks.setDailyActiveId.mockResolvedValue({
      previousId: "1",
      account: ACCOUNTS[1],
    });
    mocks.setDailySelectionMode.mockResolvedValue({ previousMode: "pin" });
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

  it("GET lists accounts and rotation state", async () => {
    const { status, json } = await parseResponse(await GET());
    expect(status).toBe(200);
    expect(json.accounts).toEqual([
      { id: "1", domain: "refocus-hq.daily.co", keyHint: "…2b5d" },
      { id: "2", domain: "refocus-vc.daily.co", keyHint: "…6e02" },
    ]);
    expect(json.selectionMode).toBe("rotate");
    expect(json.activeId).toBe("1");
    expect(json.nextId).toBe("1");
  });

  it("GET uses stored pin when valid", async () => {
    mocks.getDailyAdminState.mockResolvedValue({
      selectionMode: "pin",
      activeId: "2",
      nextId: "1",
    });
    const { status, json } = await parseResponse(await GET());
    expect(status).toBe(200);
    expect(json.selectionMode).toBe("pin");
    expect(json.activeId).toBe("2");
  });

  it("PATCH rotate enables equal cycling", async () => {
    const req = mockRequest("/api/admin/daily", {
      method: "PATCH",
      body: { selectionMode: "rotate" },
    });
    const { status, json } = await parseResponse(await PATCH(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.selectionMode).toBe("rotate");
    expect(mocks.setDailySelectionMode).toHaveBeenCalledWith("rotate", "admin-1");
    expect(mocks.logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "daily.rotate_accounts" }),
    );
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

  it("PATCH pins account and audits", async () => {
    mocks.getDailyAdminState.mockResolvedValue({
      selectionMode: "pin",
      activeId: "2",
      nextId: "1",
    });
    const req = mockRequest("/api/admin/daily", {
      method: "PATCH",
      body: { activeId: "2" },
    });
    const { status, json } = await parseResponse(await PATCH(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.activeId).toBe("2");
    expect(json.selectionMode).toBe("pin");
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
