import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse, mockCollection, mockDb } from "../../helpers";
import { ObjectId } from "mongodb";

// Mock rate limiting — allow all by default
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 5,
    remaining: 4,
    reset: Date.now() + 60000,
  }),
  rateLimitedResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

const usersCol = mockCollection();
const db = mockDb({ users: usersCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { POST } from "@/app/api/auth/register/route";
import { checkRateLimit } from "@/lib/ratelimit";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    usersCol.createIndex.mockResolvedValue("email_1");
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60000,
    });
  });

  it("returns 400 when email is missing", async () => {
    const req = mockRequest("/api/auth/register", {
      body: { password: "StrongP@ss1" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toBe("Missing email or password");
  });

  it("returns 400 when password is missing", async () => {
    const req = mockRequest("/api/auth/register", {
      body: { email: "test@example.com" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toBe("Missing email or password");
  });

  it("returns 400 for weak passwords", async () => {
    const req = mockRequest("/api/auth/register", {
      body: { email: "test@example.com", password: "abc" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toBe("Password is too weak");
    expect(json.requirements).toBeDefined();
  });

  it("returns 429 when rate limited", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const { rateLimitedResponse } = await import("@/lib/ratelimit");

    const req = mockRequest("/api/auth/register", {
      body: { email: "test@example.com", password: "StrongP@ss1" },
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(rateLimitedResponse).toHaveBeenCalled();
  });

  it("successfully registers a new user with valid input", async () => {
    const insertedId = new ObjectId();
    usersCol.insertOne.mockResolvedValue({ insertedId });

    const req = mockRequest("/api/auth/register", {
      body: {
        email: "new@example.com",
        password: "StrongP@ss1",
        firstName: "John",
        lastName: "Doe",
      },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(json.id).toBe(String(insertedId));
    expect(usersCol.createIndex).toHaveBeenCalledWith(
      { email: 1 },
      { unique: true }
    );
  });

  it("returns 409 on duplicate email (MongoDB error 11000)", async () => {
    const dupError = new Error("E11000 duplicate key error");
    (dupError as Error & { code: number }).code = 11000;
    usersCol.insertOne.mockRejectedValue(dupError);

    const req = mockRequest("/api/auth/register", {
      body: { email: "existing@example.com", password: "StrongP@ss1" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(409);
    expect(json.error).toBe("User already exists");
  });

  it("lowercases the email before inserting", async () => {
    const insertedId = new ObjectId();
    usersCol.insertOne.mockResolvedValue({ insertedId });

    const req = mockRequest("/api/auth/register", {
      body: { email: "TeSt@Example.COM", password: "StrongP@ss1" },
    });
    await POST(req);

    const insertedDoc = usersCol.insertOne.mock.calls[0][0];
    expect(insertedDoc.email).toBe("test@example.com");
  });

  it("builds fullName from firstName and lastName", async () => {
    usersCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

    const req = mockRequest("/api/auth/register", {
      body: {
        email: "test@example.com",
        password: "StrongP@ss1",
        firstName: "Jane",
        lastName: "Smith",
      },
    });
    await POST(req);

    const insertedDoc = usersCol.insertOne.mock.calls[0][0];
    expect(insertedDoc.name).toBe("Jane Smith");
    expect(insertedDoc.firstname).toBe("Jane");
    expect(insertedDoc.lastname).toBe("Smith");
  });

  it("falls back to name field when firstName is not provided", async () => {
    usersCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

    const req = mockRequest("/api/auth/register", {
      body: {
        email: "test@example.com",
        password: "StrongP@ss1",
        name: "Alice",
      },
    });
    await POST(req);

    const insertedDoc = usersCol.insertOne.mock.calls[0][0];
    expect(insertedDoc.firstname).toBe("Alice");
  });
});
