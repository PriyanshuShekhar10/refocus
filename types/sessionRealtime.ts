import type { FetchedSession } from "@/types/calendar";

export type SessionUpsertedEvent = {
  type: "session_upserted";
  session: FetchedSession;
};

export type SessionRemovedEvent = {
  type: "session_removed";
  sessionId: string;
};

export type SessionRealtimeEvent = SessionUpsertedEvent | SessionRemovedEvent;
