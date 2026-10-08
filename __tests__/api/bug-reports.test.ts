import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../helpers";
import { buildOpsBugReportEmail } from "@/lib/email/opsTemplates";

const notifyOpsBugReport = vi.hoisted(() => vi.fn().mockResolvedValue({ sent: true }));
vi.mock("@/lib/email/opsNotify", () => ({ notifyOpsBugReport }));

const users = mockCollection();
const bugReports = mockCollection();
const db = mockDb({ users, bug_reports: bugReports });
vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn().mockImplementation(() => Promise.resolve(db)) }));

import { POST } from "@/app/api/bug-reports/route";

const USER_ID = new ObjectId();
const send = (body: Record<string, unknown>) =>
  POST(mockRequest("/api/bug-reports", { method: "POST", body }));

describe("POST /api/bug-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    users.findOne.mockResolvedValue({ _id: USER_ID, email: "maya@example.com", firstname: "Maya", lastname: "Chen" });
    bugReports.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    bugReports.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("requires a signed-in user", async () => {
    mockSession(null);
    const { status } = await parseResponse(await send({ description: "Something broke here" }));
    expect(status).toBe(401);
  });

  it("rejects descriptions that are too short", async () => {
    mockSession(String(USER_ID));
    const { status } = await parseResponse(await send({ description: "bug" }));
    expect(status).toBe(400);
    expect(bugReports.insertOne).not.toHaveBeenCalled();
  });

  it("stores the report and emails the team", async () => {
    mockSession(String(USER_ID));
    const { status, json } = await parseResponse(
      await send({ description: "Join button does nothing on Safari", pageUrl: "https://dashboard.refocus.co.in/dashboard" }),
    );
    expect(status).toBe(201);
    expect(json.ok).toBe(true);
    expect(bugReports.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ userId: String(USER_ID), userEmail: "maya@example.com", status: "open" }),
    );
    expect(notifyOpsBugReport).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Join button does nothing on Safari",
        reporter: expect.objectContaining({ email: "maya@example.com", name: "Maya Chen" }),
      }),
    );
  });
});

describe("buildOpsBugReportEmail", () => {
  it("puts the first line in the subject and escapes HTML", () => {
    const { subject, html, text } = buildOpsBugReportEmail({
      reportId: "r1",
      reporter: { name: "Maya", email: "maya@example.com", userId: "u1" },
      description: "Calendar <script> breaks\nMore detail",
      pageUrl: "https://dashboard.refocus.co.in/dashboard",
    });
    expect(subject).toBe("Bug report: Calendar <script> breaks");
    expect(html).toContain("&lt;script&gt;");
    expect(text).toContain("Page: https://dashboard.refocus.co.in/dashboard");
  });
});
