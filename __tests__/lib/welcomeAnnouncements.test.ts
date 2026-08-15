import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const welcomeCol = mockCollection();
const usersCol = mockCollection();
const db = mockDb({
  welcome_announcements: welcomeCol,
  users: usersCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

describe("createWelcomeAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    welcomeCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    welcomeCol.createIndex.mockResolvedValue("userId_1");
    welcomeCol.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
  });

  it("inserts a welcome announcement for a new user", async () => {
    const userId = new ObjectId();
    const { createWelcomeAnnouncement } = await import(
      "@/lib/welcomeAnnouncements"
    );

    await createWelcomeAnnouncement({
      userId: String(userId),
      username: "priya",
      displayName: "Priya",
      avatarUrl: null,
    });

    expect(welcomeCol.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        username: "priya",
        displayName: "Priya",
      }),
    );
  });

  it("ignores duplicate key errors", async () => {
    const err = Object.assign(new Error("dup"), { code: 11000 });
    welcomeCol.insertOne.mockRejectedValue(err);

    const { createWelcomeAnnouncement } = await import(
      "@/lib/welcomeAnnouncements"
    );

    await expect(
      createWelcomeAnnouncement({
        userId: String(new ObjectId()),
        username: "priya",
      }),
    ).resolves.toBeUndefined();
  });
});
