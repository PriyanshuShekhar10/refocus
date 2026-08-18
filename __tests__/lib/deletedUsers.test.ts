import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import {
  serializeDeletedUser,
  snapshotDeletedUser,
} from "@/lib/deletedUsers";

describe("deletedUsers snapshots", () => {
  it("keeps identity fields and drops password secrets", () => {
    const userId = String(new ObjectId());
    const now = new Date("2026-08-18T12:00:00.000Z");
    const snapshot = snapshotDeletedUser(
      {
        _id: new ObjectId(userId),
        email: "ada@example.com",
        canonicalEmail: "ada@example.com",
        username: "ada",
        firstname: "Ada",
        lastname: "Lovelace",
        emailVerified: new Date("2026-01-02T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        hashedPassword: "secret-hash",
        password: "plain",
        emailVerificationToken: "token",
        signupIp: "203.0.113.10",
        lastLoginIp: "203.0.113.11",
        knownIps: [{ ip: "203.0.113.11", count: 2 }],
      },
      userId,
      now,
    );

    expect(snapshot.email).toBe("ada@example.com");
    expect(snapshot.username).toBe("ada");
    expect(snapshot.name).toBe("Ada Lovelace");
    expect(snapshot.deletedAt).toEqual(now);
    expect(snapshot.knownIps).toContain("203.0.113.11");
    expect(snapshot).not.toHaveProperty("hashedPassword");
    expect(snapshot).not.toHaveProperty("password");
    expect(snapshot).not.toHaveProperty("emailVerificationToken");

    const dto = serializeDeletedUser(snapshot);
    expect(dto.deletedAt).toBe(now.toISOString());
    expect(dto.emailVerified).toBe(true);
  });
});
