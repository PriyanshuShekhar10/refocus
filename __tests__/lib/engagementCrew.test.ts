import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const crewCol = mockCollection();
const usersCol = mockCollection();
const db = mockDb({
  engagement_crew: crewCol,
  users: usersCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import {
  addEngagementCrewMember,
  isEngagementCrewUserId,
  listEngagementCrew,
  removeEngagementCrewMember,
  resolveEngagementCrewMembers,
} from "@/lib/engagementCrew";

describe("engagementCrew", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    crewCol.createIndex.mockResolvedValue("idx");
    crewCol.findOne.mockResolvedValue(null);
    crewCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    crewCol.deleteOne.mockResolvedValue({ deletedCount: 1 });
    crewCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
    crewCol.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    });
    usersCol.findOne.mockResolvedValue(null);
    usersCol.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });
  });

  it("rejects invalid email", async () => {
    const result = await addEngagementCrewMember({
      email: "not-an-email",
      addedBy: "admin-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("adds a member and resolves registered user", async () => {
    const userId = new ObjectId();
    usersCol.findOne.mockResolvedValue({
      _id: userId,
      email: "hire@example.com",
      firstname: "Hire",
      lastname: "Me",
    });

    const result = await addEngagementCrewMember({
      email: "Hire@Example.com",
      addedBy: "admin-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.member.email).toBe("hire@example.com");
    expect(result.member.userId).toBe(String(userId));
    expect(result.member.name).toBe("Hire Me");
    expect(crewCol.insertOne).toHaveBeenCalled();
  });

  it("rejects duplicate crew email", async () => {
    crewCol.findOne.mockResolvedValue({
      canonicalEmail: "hire@example.com",
    });
    const result = await addEngagementCrewMember({
      email: "hire@example.com",
      addedBy: "admin-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it("lists members", async () => {
    const addedAt = new Date("2026-08-01T00:00:00.000Z");
    crewCol.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            email: "a@example.com",
            canonicalEmail: "a@example.com",
            userId: "u1",
            name: "A",
            addedAt,
          },
        ]),
      }),
    });
    const list = await listEngagementCrew();
    expect(list).toEqual([
      {
        email: "a@example.com",
        canonicalEmail: "a@example.com",
        userId: "u1",
        name: "A",
        addedAt: addedAt.toISOString(),
      },
    ]);
  });

  it("removes a member", async () => {
    const result = await removeEngagementCrewMember("a@example.com");
    expect(result.ok).toBe(true);
    expect(crewCol.deleteOne).toHaveBeenCalled();
  });

  it("returns 404 when removing missing member", async () => {
    crewCol.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const result = await removeEngagementCrewMember("missing@example.com");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("detects crew membership by userId", async () => {
    const userId = String(new ObjectId());
    crewCol.findOne.mockResolvedValueOnce({ userId });
    await expect(isEngagementCrewUserId(userId)).resolves.toBe(true);
  });

  it("detects crew membership by account email when userId unset on roster", async () => {
    const userId = String(new ObjectId());
    crewCol.findOne
      .mockResolvedValueOnce(null) // by userId
      .mockResolvedValueOnce({ canonicalEmail: "crew@example.com" }); // by email
    usersCol.findOne.mockResolvedValue({
      _id: new ObjectId(userId),
      email: "crew@example.com",
    });
    await expect(isEngagementCrewUserId(userId)).resolves.toBe(true);
  });

  it("returns false for non-crew users", async () => {
    const userId = String(new ObjectId());
    crewCol.findOne.mockResolvedValue(null);
    usersCol.findOne.mockResolvedValue({
      _id: new ObjectId(userId),
      email: "other@example.com",
    });
    await expect(isEngagementCrewUserId(userId)).resolves.toBe(false);
  });

  it("re-resolves unregistered members when they sign up", async () => {
    const userId = new ObjectId();
    crewCol.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            email: "new@example.com",
            canonicalEmail: "new@example.com",
            userId: null,
            name: null,
            addedAt: new Date(),
            addedBy: "admin",
          },
        ]),
      }),
    });
    usersCol.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: userId,
          email: "new@example.com",
          name: "New Hire",
        },
      ]),
    });

    const resolved = await resolveEngagementCrewMembers();
    expect(resolved[0]?.userId).toBe(String(userId));
    expect(resolved[0]?.name).toBe("New Hire");
    expect(crewCol.bulkWrite).toHaveBeenCalled();
  });
});
