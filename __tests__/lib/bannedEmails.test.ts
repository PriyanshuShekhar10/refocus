import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const bannedEmailsCol = mockCollection();
const db = mockDb({ banned_emails: bannedEmailsCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

describe("bannedEmails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bannedEmailsCol.findOne.mockResolvedValue(null);
    bannedEmailsCol.updateOne.mockResolvedValue({ upsertedCount: 1 });
    bannedEmailsCol.deleteOne.mockResolvedValue({ deletedCount: 1 });
    bannedEmailsCol.createIndex.mockResolvedValue("canonicalEmail_1");
  });

  it("treats missing denylist rows as not banned", async () => {
    const { isEmailBanned } = await import("@/lib/bannedEmails");
    expect(await isEmailBanned("user@gmail.com")).toBe(false);
  });

  it("upserts canonical email on ban and deletes on unban", async () => {
    const { banEmail, unbanEmail } = await import("@/lib/bannedEmails");
    await banEmail({
      email: "a.b+spam@gmail.com",
      userId: String(new ObjectId()),
      bannedBy: String(new ObjectId()),
    });
    expect(bannedEmailsCol.updateOne).toHaveBeenCalledWith(
      { canonicalEmail: "ab@gmail.com" },
      expect.objectContaining({
        $set: expect.objectContaining({ canonicalEmail: "ab@gmail.com" }),
      }),
      { upsert: true },
    );

    await unbanEmail("a.b+spam@gmail.com");
    expect(bannedEmailsCol.deleteOne).toHaveBeenCalledWith({
      canonicalEmail: "ab@gmail.com",
    });
  });
});
