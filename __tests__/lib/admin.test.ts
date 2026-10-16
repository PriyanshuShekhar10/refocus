/**
 * Admin helpers: role lookup and the requireAdmin guard used by every admin
 * route. Guards the route-wrapper refactor (docs/REFACTOR-PLAN.md, Phase 3).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { mockCollection, mockDb } from "../helpers";

const users = mockCollection();
const db = mockDb({ users });
vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn().mockImplementation(() => Promise.resolve(db)) }));

import { ADMIN_ROLE, countAdmins, isUserAdmin, requireAdmin } from "@/lib/admin";

const ADMIN_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

describe("isUserAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is false for missing or malformed ids without touching the database", async () => {
    expect(await isUserAdmin(null)).toBe(false);
    expect(await isUserAdmin(undefined)).toBe(false);
    expect(await isUserAdmin("not-an-id")).toBe(false);
    expect(users.findOne).not.toHaveBeenCalled();
  });

  it("checks the user's role", async () => {
    users.findOne.mockResolvedValueOnce({ role: ADMIN_ROLE });
    expect(await isUserAdmin(ADMIN_ID)).toBe(true);
    expect(users.findOne).toHaveBeenCalledWith({ _id: new ObjectId(ADMIN_ID) }, { projection: { role: 1 } });

    users.findOne.mockResolvedValueOnce({ role: "member" });
    expect(await isUserAdmin(ADMIN_ID)).toBe(false);

    users.findOne.mockResolvedValueOnce(null);
    expect(await isUserAdmin(ADMIN_ID)).toBe(false);
  });
});

describe("requireAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401s without a signed-in user id and email", async () => {
    for (const session of [null, { user: { id: ADMIN_ID } }, { user: { email: "a@example.com" } }]) {
      vi.mocked(getServerSession).mockResolvedValueOnce(session as never);
      const guard = await requireAdmin();
      expect(guard.ok).toBe(false);
      if (!guard.ok) {
        expect(guard.response.status).toBe(401);
        expect(await guard.response.json()).toEqual({ error: "Unauthorized" });
      }
    }
  });

  it("403s for signed-in non-admins", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: ADMIN_ID, email: "a@example.com" } } as never);
    users.findOne.mockResolvedValueOnce({ role: null });
    const guard = await requireAdmin();
    expect(guard.ok).toBe(false);
    if (!guard.ok) {
      expect(guard.response.status).toBe(403);
      expect(await guard.response.json()).toEqual({ error: "Forbidden" });
    }
  });

  it("returns the admin's id and email", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: ADMIN_ID, email: "a@example.com" } } as never);
    users.findOne.mockResolvedValueOnce({ role: ADMIN_ROLE });
    expect(await requireAdmin()).toEqual({ ok: true, admin: { userId: ADMIN_ID, email: "a@example.com" } });
  });
});

describe("countAdmins", () => {
  it("counts users with the admin role", async () => {
    users.countDocuments.mockResolvedValueOnce(2);
    expect(await countAdmins()).toBe(2);
    expect(users.countDocuments).toHaveBeenCalledWith({ role: ADMIN_ROLE });
  });
});
