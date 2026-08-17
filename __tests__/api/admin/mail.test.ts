import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb, mockRequest, parseResponse } from "../../helpers";

function fluentFind(rows: unknown[] = []) {
  const cursor: Record<string, unknown> = {};
  cursor.sort = vi.fn(() => cursor);
  cursor.limit = vi.fn(() => cursor);
  cursor.skip = vi.fn(() => cursor);
  cursor.project = vi.fn(() => cursor);
  cursor.toArray = vi.fn().mockResolvedValue(rows);
  return cursor;
}

const usersCol = mockCollection();
const mailCol = mockCollection();
const auditCol = mockCollection();
const db = mockDb({
  users: usersCol,
  admin_mail: mailCol,
  admin_audit_log: auditCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
  isUserAdmin: vi.fn(),
  ADMIN_ROLE: "admin",
}));

vi.mock("@/lib/resend", () => ({
  isResendConfigured: vi.fn(() => true),
  getResend: vi.fn(),
  getResendFromEmail: vi.fn(() => "Refocus <hello@refocus.co.in>"),
}));

const sendAdminUserEmail = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ sent: true }),
);

vi.mock("@/lib/email/sendAdminMail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/sendAdminMail")>();
  return {
    ...actual,
    sendAdminUserEmail,
  };
});

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 20,
    remaining: 19,
    reset: Date.now() + 60_000,
  }),
  rateLimitedResponse: vi.fn(),
}));

import { requireAdmin } from "@/lib/admin";
import { GET, POST } from "@/app/api/admin/mail/route";

describe("/api/admin/mail", () => {
  const adminId = String(new ObjectId());
  const userId = String(new ObjectId());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      admin: { userId: adminId, email: "admin@example.com" },
    });
    sendAdminUserEmail.mockResolvedValue({ sent: true });
    mailCol.find.mockReturnValue(fluentFind([]));
    mailCol.countDocuments.mockResolvedValue(0);
    mailCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    auditCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    usersCol.find.mockReturnValue(
      fluentFind([
        {
          _id: new ObjectId(userId),
          email: "alex@example.com",
          firstname: "Alex",
          username: "alex",
        },
      ]),
    );
  });

  it("rejects empty recipient lists", async () => {
    const req = mockRequest("/api/admin/mail", {
      body: { userIds: [], subject: "Hi", body: "Hello" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toMatch(/at least one/i);
    expect(sendAdminUserEmail).not.toHaveBeenCalled();
  });

  it("sends to selected users and stores a copy", async () => {
    const req = mockRequest("/api/admin/mail", {
      body: {
        userIds: [userId],
        subject: "Welcome back",
        body: "Hope the session went well.",
      },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.sentCount).toBe(1);
    expect(sendAdminUserEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "alex@example.com",
        subject: "Welcome back",
      }),
    );
    expect(mailCol.insertOne).toHaveBeenCalled();
    expect(auditCol.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.email" }),
    );
  });

  it("lists sent mail for admins", async () => {
    mailCol.find.mockReturnValue(
      fluentFind([
        {
          _id: new ObjectId(),
          actorEmail: "admin@example.com",
          subject: "Welcome back",
          body: "Hope the session went well.",
          recipients: [{ email: "alex@example.com", status: "sent" }],
          sentCount: 1,
          failedCount: 0,
          createdAt: new Date("2026-08-17T12:00:00.000Z"),
        },
      ]),
    );
    mailCol.countDocuments.mockResolvedValue(1);
    const { status, json } = await parseResponse(
      await GET(mockRequest("/api/admin/mail", { method: "GET" })),
    );
    expect(status).toBe(200);
    expect(json.messages).toHaveLength(1);
    expect(json.messages[0].subject).toBe("Welcome back");
  });
});
