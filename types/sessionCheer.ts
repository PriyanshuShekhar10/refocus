export type SessionCheerEvent = {
  type: "session_cheer";
  sessionId: string;
  fromUserId: string;
  at: string;
};
