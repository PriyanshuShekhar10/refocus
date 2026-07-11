import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";
import type { DecodedIdToken } from "firebase-admin/auth";

const usersCol = mockCollection();
const db = mockDb({ users: usersCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

function makeDecodedToken(
  overrides: Partial<DecodedIdToken> = {},
): DecodedIdToken {
  return {
    uid: "firebase-uid-123",
    email: "user@example.com",
    email_verified: true,
    name: "Test User",
    picture: "https://lh3.googleusercontent.com/photo.jpg",
    firebase: {
      sign_in_provider: "google.com",
      identities: {},
    },
    aud: "project",
    auth_time: 0,
    exp: 0,
    iat: 0,
    iss: "https://securetoken.google.com/project",
    sub: "firebase-uid-123",
    ...overrides,
  } as DecodedIdToken;
}

describe("upsertFirebaseUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersCol.findOne.mockResolvedValue(null);
    usersCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    usersCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("creates a new user with image and emailVerified", async () => {
    const insertedId = new ObjectId();
    usersCol.insertOne.mockResolvedValue({ insertedId });

    const { upsertFirebaseUser } = await import(
      "@/lib/users/upsertFirebaseUser"
    );
    const result = await upsertFirebaseUser(makeDecodedToken());

    expect(result.isNewUser).toBe(true);
    expect(result.id).toBe(String(insertedId));
    expect(result.email).toBe("user@example.com");
    expect(result.name).toBe("Test User");
    expect(result.image).toBe("https://lh3.googleusercontent.com/photo.jpg");

    const insertedDoc = usersCol.insertOne.mock.calls[0][0];
    expect(insertedDoc.email).toBe("user@example.com");
    expect(insertedDoc.firebaseUid).toBe("firebase-uid-123");
    expect(insertedDoc.authProviders).toEqual({ google: "firebase-uid-123" });
    expect(insertedDoc.image).toBe("https://lh3.googleusercontent.com/photo.jpg");
    expect(insertedDoc.emailVerified).toBeInstanceOf(Date);
    expect(insertedDoc.username).toBeTruthy();
    expect(insertedDoc.hashedPassword).toBeUndefined();
  });

  it("auto-links an existing email/password account", async () => {
    const existingId = new ObjectId();
    usersCol.findOne.mockResolvedValue({
      _id: existingId,
      email: "user@example.com",
      hashedPassword: "hashed",
      firstname: "Existing",
      lastname: "User",
      name: "Existing User",
      avatar_url: null,
      image: null,
      emailVerified: null,
      authProviders: {},
    });

    const { upsertFirebaseUser } = await import(
      "@/lib/users/upsertFirebaseUser"
    );
    const result = await upsertFirebaseUser(makeDecodedToken());

    expect(result.isNewUser).toBe(false);
    expect(result.id).toBe(String(existingId));
    expect(usersCol.insertOne).not.toHaveBeenCalled();
    expect(usersCol.updateOne).toHaveBeenCalledWith(
      { _id: existingId },
      {
        $set: expect.objectContaining({
          firebaseUid: "firebase-uid-123",
          authProviders: { google: "firebase-uid-123" },
          emailVerified: expect.any(Date),
          image: "https://lh3.googleusercontent.com/photo.jpg",
        }),
      },
    );
  });

  it("does not overwrite existing profile fields when linking", async () => {
    const existingId = new ObjectId();
    usersCol.findOne.mockResolvedValue({
      _id: existingId,
      email: "user@example.com",
      hashedPassword: "hashed",
      firstname: "Jane",
      lastname: "Doe",
      name: "Jane Doe",
      avatar_url: "https://blob.example/avatar.jpg",
      image: "https://legacy.example/old.jpg",
      emailVerified: new Date("2024-01-01"),
      authProviders: { google: "old-uid" },
    });

    const { upsertFirebaseUser } = await import(
      "@/lib/users/upsertFirebaseUser"
    );
    const result = await upsertFirebaseUser(
      makeDecodedToken({ name: "New Name", picture: "https://new.example/p.jpg" }),
    );

    expect(result.isNewUser).toBe(false);
    expect(result.image).toBe("https://blob.example/avatar.jpg");

    const update = usersCol.updateOne.mock.calls[0][1];
    expect(update.$set).not.toHaveProperty("firstname");
    expect(update.$set).not.toHaveProperty("lastname");
    expect(update.$set).not.toHaveProperty("name");
    expect(update.$set).not.toHaveProperty("image");
    expect(update.$set).not.toHaveProperty("emailVerified");
    expect(update.$set.authProviders).toEqual({ google: "firebase-uid-123" });
  });

  it("verifies Google users even when email_verified is absent in token", async () => {
    const insertedId = new ObjectId();
    usersCol.insertOne.mockResolvedValue({ insertedId });

    const { upsertFirebaseUser } = await import(
      "@/lib/users/upsertFirebaseUser"
    );
    await upsertFirebaseUser(
      makeDecodedToken({ email_verified: false }),
    );

    const insertedDoc = usersCol.insertOne.mock.calls[0][0];
    expect(insertedDoc.emailVerified).toBeInstanceOf(Date);
  });

  it("uses client displayName when token name is missing", async () => {
    const insertedId = new ObjectId();
    usersCol.insertOne.mockResolvedValue({ insertedId });

    const { upsertFirebaseUser } = await import(
      "@/lib/users/upsertFirebaseUser"
    );
    await upsertFirebaseUser(
      makeDecodedToken({ name: undefined, picture: undefined }),
      "Ada Lovelace",
    );

    const insertedDoc = usersCol.insertOne.mock.calls[0][0];
    expect(insertedDoc.name).toBe("Ada Lovelace");
    expect(insertedDoc.firstname).toBe("Ada");
    expect(insertedDoc.lastname).toBe("Lovelace");
    expect(insertedDoc.authProviders).toEqual({ google: "firebase-uid-123" });
    expect(insertedDoc.emailVerified).toBeInstanceOf(Date);
  });

  it("rejects sign-in when email is missing", async () => {
    const { upsertFirebaseUser } = await import(
      "@/lib/users/upsertFirebaseUser"
    );

    await expect(
      upsertFirebaseUser(makeDecodedToken({ email: undefined })),
    ).rejects.toThrow(/No email returned/);
  });
});
