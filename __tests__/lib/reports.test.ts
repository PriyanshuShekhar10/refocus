/**
 * resolveReportTarget: who a report is about and what gets snapshotted, for
 * every report type. Guards the data-access refactor (Phase 4).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

vi.mock("@/lib/friendship", () => ({ areFriends: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/admin", () => ({ isUserAdmin: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/adminAudit", () => ({
  getUserAuditLabel: vi.fn().mockResolvedValue({ email: "them@example.com", label: "Them" }),
}));

import { areFriends } from "@/lib/friendship";
import { isUserAdmin } from "@/lib/admin";
import { getUserAuditLabel } from "@/lib/adminAudit";
import { CONTENT_SNAPSHOT_MAX_LENGTH } from "@/lib/reportConstants";
import { ReportValidationError, resolveReportTarget, truncateSnapshot } from "@/lib/reports";

const ME = "aaaaaaaaaaaaaaaaaaaaaaaa";
const THEM = "bbbbbbbbbbbbbbbbbbbbbbbb";
const TARGET = new ObjectId().toHexString();

function setup(docs: Record<string, unknown>) {
  const cols: Record<string, ReturnType<typeof mockCollection>> = {};
  for (const [name, doc] of Object.entries(docs)) {
    cols[name] = mockCollection();
    cols[name].findOne.mockResolvedValue(doc);
  }
  return mockDb(cols) as never;
}

async function expectError(p: Promise<unknown>, message: string, status: number) {
  const err = (await p.catch((e: unknown) => e)) as ReportValidationError;
  expect(err).toBeInstanceOf(ReportValidationError);
  expect(err.message).toBe(message);
  expect(err.status).toBe(status);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(areFriends).mockResolvedValue(true);
  vi.mocked(isUserAdmin).mockResolvedValue(false);
  vi.mocked(getUserAuditLabel).mockResolvedValue({ email: "them@example.com", label: "Them" } as never);
});

describe("truncateSnapshot", () => {
  it("trims, and cuts long content with an ellipsis", () => {
    expect(truncateSnapshot(null)).toBe("");
    expect(truncateSnapshot("  hi  ")).toBe("hi");
    const long = "x".repeat(CONTENT_SNAPSHOT_MAX_LENGTH + 5);
    expect(truncateSnapshot(long)).toBe(`${"x".repeat(CONTENT_SNAPSHOT_MAX_LENGTH)}…`);
  });
});

describe("resolveReportTarget", () => {
  it("rejects malformed target ids", async () => {
    await expectError(resolveReportTarget(setup({}), ME, "community_post", "nope"), "Invalid target id", 400);
  });

  it("rejects unknown target types", async () => {
    await expectError(resolveReportTarget(setup({}), ME, "bogus" as never, TARGET), "Invalid target type", 400);
  });

  describe("friend messages", () => {
    const msg = { from_user_id: THEM, to_user_id: ME, content: "rude words" };

    it("reports the sender with a snapshot", async () => {
      const r = await resolveReportTarget(setup({ messages: msg }), ME, "friend_message", TARGET);
      expect(r).toEqual({ reportedUserId: THEM, reportedUserEmail: "them@example.com", reportedUserLabel: "Them", contentSnapshot: "rude words" });
    });

    it("404s for missing messages", async () => {
      await expectError(resolveReportTarget(setup({ messages: null }), ME, "friend_message", TARGET), "Message not found", 404);
    });

    it("403s for outsiders and non-friends", async () => {
      await expectError(resolveReportTarget(setup({ messages: { ...msg, to_user_id: "cccccccccccccccccccccccc" } }), ME, "friend_message", TARGET), "Forbidden", 403);
      vi.mocked(areFriends).mockResolvedValueOnce(false);
      await expectError(resolveReportTarget(setup({ messages: msg }), ME, "friend_message", TARGET), "Forbidden", 403);
    });

    it("refuses your own messages and messages from admins", async () => {
      await expectError(resolveReportTarget(setup({ messages: { ...msg, from_user_id: ME, to_user_id: THEM } }), ME, "friend_message", TARGET), "You cannot report your own content", 400);
      vi.mocked(isUserAdmin).mockResolvedValueOnce(true);
      await expectError(resolveReportTarget(setup({ messages: msg }), ME, "friend_message", TARGET), "Cannot report an admin", 400);
    });
  });

  describe("community chat, posts and comments", () => {
    const cases = [
      ["global_message", "global_messages", { user_id: THEM, user_name: "Chat name", content: "spam" }, "Message not found"],
      ["community_post", "community_posts", { authorId: new ObjectId(THEM), content: "spam" }, "Post not found"],
      ["community_comment", "community_comments", { authorId: new ObjectId(THEM), content: "spam" }, "Comment not found"],
    ] as const;

    it.each(cases)("%s: reports the author", async (type, collection, doc) => {
      const r = await resolveReportTarget(setup({ [collection]: doc }), ME, type, TARGET);
      expect(r).toMatchObject({ reportedUserId: THEM, contentSnapshot: "spam" });
    });

    it.each(cases)("%s: 404 when missing", async (type, collection, _doc, notFound) => {
      await expectError(resolveReportTarget(setup({ [collection]: null }), ME, type, TARGET), notFound, 404);
    });

    it.each(cases)("%s: refuses own content and admins", async (type, collection, doc) => {
      const mine = "user_id" in doc ? { ...doc, user_id: ME } : { ...doc, authorId: new ObjectId(ME) };
      await expectError(resolveReportTarget(setup({ [collection]: mine }), ME, type, TARGET), "You cannot report your own content", 400);
      vi.mocked(isUserAdmin).mockResolvedValueOnce(true);
      await expectError(resolveReportTarget(setup({ [collection]: doc }), ME, type, TARGET), "Cannot report an admin", 400);
    });

    it("falls back to the chat display name when the user has no label", async () => {
      vi.mocked(getUserAuditLabel).mockResolvedValueOnce({ email: null, label: null } as never);
      const r = await resolveReportTarget(setup({ global_messages: cases[0][2] }), ME, "global_message", TARGET);
      expect(r.reportedUserLabel).toBe("Chat name");
    });
  });

  describe("profiles", () => {
    it("requires a completed shared session", async () => {
      await expectError(resolveReportTarget(setup({ users: { _id: THEM }, sessions: null }), ME, "user", THEM), "You can only report users you have completed a session with", 403);
      const r = await resolveReportTarget(setup({ users: { _id: THEM }, sessions: { _id: TARGET } }), ME, "user", THEM);
      expect(r).toMatchObject({ reportedUserId: THEM, contentSnapshot: "Profile report — shared session partner" });
    });

    it("refuses yourself, missing users and admins", async () => {
      await expectError(resolveReportTarget(setup({}), ME, "user", ME), "You cannot report yourself", 400);
      await expectError(resolveReportTarget(setup({ users: null }), ME, "user", THEM), "User not found", 404);
      vi.mocked(isUserAdmin).mockResolvedValueOnce(true);
      await expectError(resolveReportTarget(setup({ users: { _id: THEM } }), ME, "user", THEM), "Cannot report an admin", 400);
    });
  });

  describe("session calls", () => {
    const live = () => ({
      owner_id: ME,
      start_time: new Date(Date.now() - 10 * 60_000),
      end_time: new Date(Date.now() + 40 * 60_000),
      session_participants: [{ user_id: ME }, { user_id: THEM }],
    });

    it("infers the only partner when no user is named", async () => {
      const r = await resolveReportTarget(setup({ sessions: live() }), ME, "session_call", TARGET);
      expect(r.reportedUserId).toBe(THEM);
    });

    it("404s for missing sessions", async () => {
      await expectError(resolveReportTarget(setup({ sessions: null }), ME, "session_call", TARGET), "Session not found", 404);
    });
  });
});
