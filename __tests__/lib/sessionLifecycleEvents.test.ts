import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const lifecycleCol = mockCollection();
const db = mockDb({ session_lifecycle_events: lifecycleCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { logSessionDeleted } from "@/lib/sessionLifecycleEvents";

describe("logSessionDeleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lifecycleCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    lifecycleCol.createIndex.mockResolvedValue("idx");
  });

  it("inserts a hard-delete event", async () => {
    await logSessionDeleted({
      userId: "user-1",
      sessionId: "sess-1",
      kind: "hard",
    });
    expect(lifecycleCol.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "session_deleted",
        userId: "user-1",
        sessionId: "sess-1",
        kind: "hard",
        at: expect.any(Date),
      }),
    );
    expect(lifecycleCol.createIndex).toHaveBeenCalled();
  });

  it("inserts a transfer-delete event", async () => {
    const at = new Date("2026-08-21T10:00:00.000Z");
    await logSessionDeleted({
      userId: "user-2",
      sessionId: "sess-2",
      kind: "transfer",
      at,
    });
    expect(lifecycleCol.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "session_deleted",
        kind: "transfer",
        at,
      }),
    );
  });
});
