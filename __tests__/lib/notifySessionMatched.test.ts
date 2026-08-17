import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const sendMatchedSessionEmail = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ sent: true }),
);
const notifyOpsSessionMatched = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);
const markReminderSent = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("@/lib/email/sendMatchedSessionEmail", () => ({
  sendMatchedSessionEmail,
}));

vi.mock("@/lib/email/opsNotify", () => ({
  notifyOpsSessionMatched,
  notifyOpsSignup: vi.fn(),
}));

vi.mock("@/lib/sessionReminders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sessionReminders")>();
  return {
    ...actual,
    markReminderSent,
    sessionJoinUrl: (id: string) => `https://refocus.co.in/sessions/${id}`,
  };
});

const usersCol = mockCollection();
const sessionsCol = mockCollection();
const db = mockDb({
  users: usersCol,
  sessions: sessionsCol,
});

import { notifySessionMatched } from "@/lib/notifySessionMatched";

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
    preferences?: { timezone?: string; emailSessionReminders?: boolean };
  }>,
) {
  usersCol.find.mockReturnValue({
    project: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue(rows),
    }),
  });
}

describe("notifySessionMatched", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markReminderSent.mockResolvedValue(true);
    sendMatchedSessionEmail.mockResolvedValue({ sent: true });
    sessionsCol.findOne.mockResolvedValue(null);
  });

  it("emails the host when someone joins their calendar session", async () => {
    mockUsers([
      {
        _id: OWNER_ID,
        email: "host@example.com",
        firstname: "Priya",
      },
      {
        _id: JOINER_ID,
        email: "joiner@example.com",
        firstname: "Alex",
      },
    ]);

    await notifySessionMatched(db as never, {
      _id: SESSION_ID,
      owner_id: String(OWNER_ID),
      start_time: START,
      duration_min: 50,
      session_type: "focus",
      session_participants: [
        { user_id: String(OWNER_ID) },
        { user_id: String(JOINER_ID) },
      ],
    });

    expect(sendMatchedSessionEmail).toHaveBeenCalledTimes(2);
    expect(sendMatchedSessionEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "host@example.com",
        firstName: "Priya",
        partnerLabel: "Alex",
        isHost: true,
      }),
    );
    expect(sendMatchedSessionEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "joiner@example.com",
        isHost: false,
      }),
    );
    expect(notifyOpsSessionMatched).toHaveBeenCalledTimes(1);
    expect(notifyOpsSessionMatched).toHaveBeenCalledWith(
      expect.objectContaining({
        host: expect.objectContaining({ email: "host@example.com" }),
        joiner: expect.objectContaining({ email: "joiner@example.com" }),
      }),
    );
  });

  it("still emails the host when session reminders are turned off", async () => {
    mockUsers([
      {
        _id: OWNER_ID,
        email: "host@example.com",
        firstname: "Priya",
        preferences: { emailSessionReminders: false },
      },
      {
        _id: JOINER_ID,
        email: "joiner@example.com",
        firstname: "Alex",
      },
    ]);

    await notifySessionMatched(db as never, {
      _id: SESSION_ID,
      owner_id: String(OWNER_ID),
      start_time: START,
      session_participants: [
        { user_id: String(OWNER_ID) },
        { user_id: String(JOINER_ID) },
      ],
    });

    expect(sendMatchedSessionEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "host@example.com",
        isHost: true,
      }),
    );
  });

  it("does not send when the session still has only the host", async () => {
    mockUsers([
      { _id: OWNER_ID, email: "host@example.com", firstname: "Priya" },
    ]);

    await notifySessionMatched(db as never, {
      _id: SESSION_ID,
      owner_id: String(OWNER_ID),
      start_time: START,
      session_participants: [{ user_id: String(OWNER_ID) }],
    });

    expect(sendMatchedSessionEmail).not.toHaveBeenCalled();
    expect(notifyOpsSessionMatched).not.toHaveBeenCalled();
  });
});
