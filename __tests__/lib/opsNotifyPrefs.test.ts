import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockCollection, mockDb } from "../helpers";

const settingsCol = mockCollection();
const db = mockDb({ app_settings: settingsCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import {
  DEFAULT_OPS_NOTIFY_PREFS,
  getOpsNotifyPrefs,
  isOpsNotifyKindEnabled,
  setOpsNotifyPrefs,
} from "@/lib/email/opsNotifyPrefs";

describe("opsNotifyPrefs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsCol.findOne.mockResolvedValue(null);
    settingsCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("defaults both flags on when no settings doc exists", async () => {
    await expect(getOpsNotifyPrefs()).resolves.toEqual(DEFAULT_OPS_NOTIFY_PREFS);
    await expect(isOpsNotifyKindEnabled("signup")).resolves.toBe(true);
    await expect(isOpsNotifyKindEnabled("sessionMatched")).resolves.toBe(true);
  });

  it("treats explicit false as off", async () => {
    settingsCol.findOne.mockResolvedValue({
      key: "ops_notify",
      signup: false,
      sessionMatched: true,
    });
    await expect(isOpsNotifyKindEnabled("signup")).resolves.toBe(false);
    await expect(isOpsNotifyKindEnabled("sessionMatched")).resolves.toBe(true);
  });

  it("upserts only the patched flags", async () => {
    settingsCol.findOne.mockResolvedValue({
      key: "ops_notify",
      signup: false,
      sessionMatched: true,
    });
    const prefs = await setOpsNotifyPrefs({ signup: false }, "admin-1");
    expect(settingsCol.updateOne).toHaveBeenCalledWith(
      { key: "ops_notify" },
      expect.objectContaining({
        $set: expect.objectContaining({
          signup: false,
          updatedBy: "admin-1",
        }),
      }),
      { upsert: true },
    );
    expect(prefs.signup).toBe(false);
  });
});
