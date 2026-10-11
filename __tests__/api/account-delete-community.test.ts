import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../helpers";

vi.mock("@/lib/deletedUsers", () => ({ archiveDeletedUser: vi.fn().mockResolvedValue(undefined) }));

const users = mockCollection();
const posts = mockCollection();
const comments = mockCollection();
const likes = mockCollection();
const db = mockDb({
  users,
  community_posts: posts,
  community_comments: comments,
  community_likes: likes,
});
vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn().mockImplementation(() => Promise.resolve(db)) }));

import { POST } from "@/app/api/users/me/delete/route";

const ME = new ObjectId();
const MY_POST_1 = new ObjectId();
const MY_POST_2 = new ObjectId();

const del = () =>
  POST(mockRequest("/api/users/me/delete", { method: "POST", body: { confirmText: "DELETE" } }));

describe("POST /api/users/me/delete — community cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(String(ME));
    // OAuth-style account (no password) so only confirmText is needed.
    users.findOne.mockResolvedValue({ _id: ME, email: "me@example.com" });
    users.deleteOne.mockResolvedValue({ deletedCount: 1 });
    posts.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue([{ _id: MY_POST_1 }, { _id: MY_POST_2 }]) });
  });

  it("removes the user's posts, all activity on them, and the user's own comments and likes", async () => {
    const { status, json } = await parseResponse(await del());
    expect(status).toBe(200);
    expect(json.ok).toBe(true);

    // Looks up only this user's posts.
    expect(posts.find).toHaveBeenCalledWith({ authorId: ME }, { projection: { _id: 1 } });

    // Comments: the user's own anywhere, plus anyone's on the user's posts.
    expect(comments.deleteMany).toHaveBeenCalledWith({
      $or: [{ authorId: ME }, { postId: { $in: [MY_POST_1, MY_POST_2] } }],
    });
    // Likes: the user's own anywhere, plus anyone's on the user's posts.
    expect(likes.deleteMany).toHaveBeenCalledWith({
      $or: [{ userId: ME }, { postId: { $in: [MY_POST_1, MY_POST_2] } }],
    });
    // Posts: only the user's own.
    expect(posts.deleteMany).toHaveBeenCalledWith({ authorId: ME });
  });

  it("only ever targets this user's id and posts", async () => {
    await del();
    const filters = JSON.stringify([
      ...posts.deleteMany.mock.calls,
      ...comments.deleteMany.mock.calls,
      ...likes.deleteMany.mock.calls,
    ]);
    const allowed = new Set([String(ME), String(MY_POST_1), String(MY_POST_2)]);
    const ids = filters.match(/[0-9a-f]{24}/g) ?? [];
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => allowed.has(id))).toBe(true);
  });

  it("deletes a password account without asking for the password", async () => {
    users.findOne.mockResolvedValue({ _id: ME, email: "me@example.com", hashedPassword: "$2a$10$hash" });
    const { status, json } = await parseResponse(await del());
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(users.deleteOne).toHaveBeenCalledWith({ _id: ME });
  });

  it("deletes nothing in the community when the confirmation is wrong", async () => {
    const { status } = await parseResponse(
      await POST(mockRequest("/api/users/me/delete", { method: "POST", body: { confirmText: "nope" } })),
    );
    expect(status).toBe(400);
    expect(posts.deleteMany).not.toHaveBeenCalled();
    expect(comments.deleteMany).not.toHaveBeenCalled();
    expect(likes.deleteMany).not.toHaveBeenCalled();
  });
});
