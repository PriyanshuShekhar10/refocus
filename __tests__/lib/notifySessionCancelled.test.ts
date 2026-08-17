import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const sendSessionCancelledEmail = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ sent: true }),
);

vi.mock("@/lib/email/sendSessionCancelledEmail", () => ({
  sendSessionCancelledEmail,
}));

vi.mock("@/lib/sessionReminders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sessionReminders")>();
  return {
    ...actual,
    formatSessionTimeIST: () => "Tue, Aug 18, 03:30 PM",
  };
});

vi.mock("@/lib/site", () => ({
  getSiteUrl: () => "https://refocus.co.in",
}));

const usersCol = mockCollection();
const db = mockDb({ users: usersCol });

import { notifySessionCancelled } from "@/lib/notifySessionCancelled";

const OWNER_ID = new ObjectId();
const JOINER_ID = new ObjectId();
const SESSION_ID = new ObjectId();
const START = new Date("2026-08-18T10:00:00.000Z");

function mockUsers(
  rows: Array<{
    _id: ObjectId;
    email?: string | null;
    firstname?: string | null;
    name?: string | null;
  }>,
) {
  usersCol.find.mockReturnValue({
    project: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue(rows),
    }),
  });
}

const session = {
  _id: SESSION_ID,
  owner_id: String(OWNER_ID),
  start_time: START,
  duration_min: 50,
  session_type: "focus",
  session_participants: [
    { user_id: String(OWNER_ID) },
    { user_id: String(JOINER_ID) },
  ],
};

describe("notifySessionCancelled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendSessionCancelledEmail.mockResolvedValue({ sent: true });
  });

  it("emails the partner the note when the owner deletes", async () => {
    mockUsers([
      { _id: OWNER_ID, email: "host@example.com", firstname: "Priya" },
      { _id: JOINER_ID, email: "joiner@example.com", firstname: "Alex" },
    ]);

    await notifySessionCancelled(db as never, {
      session,
      actorUserId: String(OWNER_ID),
      message: "Something came up",
      kind: "delete",
    });

    expect(sendSessionCancelledEmail).toHaveBeenCalledTimes(1);
    expect(sendSessionCancelledEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "joiner@example.com",
        firstName: "Alex",
        fromName: "Priya",
        fromEmail: "host@example.com",
        message: "Something came up",
        kind: "delete",
        calendarUrl: "https://refocus.co.in/sessions",
      }),
    );
  });

  it("does not send when the partner has no email", async () => {
    mockUsers([
      { _id: OWNER_ID, email: "host@example.com", firstname: "Priya" },
      { _id: JOINER_ID, email: null, firstname: "Alex" },
    ]);

    await notifySessionCancelled(db as never, {
      session,
      actorUserId: String(OWNER_ID),
      message: "Something came up",
      kind: "delete",
    });

    expect(sendSessionCancelledEmail).not.toHaveBeenCalled();
  });

  it("does not send when there is no partner", async () => {
    await notifySessionCancelled(db as never, {
      session: {
        ...session,
        session_participants: [{ user_id: String(OWNER_ID) }],
      },
      actorUserId: String(OWNER_ID),
      message: "Something came up",
      kind: "delete",
    });

    expect(sendSessionCancelledEmail).not.toHaveBeenCalled();
  });
});
