import { ObjectId, type Db } from "mongodb";
import { publishAbly } from "@/lib/ably-server";
import { sessionsChannel } from "@/lib/realtimeChannels";
import { isEmailVerified } from "@/lib/emailVerification";
import type { FetchedSession } from "@/types/calendar";
import type { DurationMin, SessionType, SessionStatus } from "@/constants/calendar";
import type {
  SessionRemovedEvent,
  SessionUpsertedEvent,
} from "@/types/sessionRealtime";
import type { SessionParticipantDoc } from "@/lib/sessionPersonalization";

export type {
  SessionRealtimeEvent,
  SessionRemovedEvent,
  SessionUpsertedEvent,
} from "@/types/sessionRealtime";

export type SessionRealtimeDoc = {
  _id: ObjectId;
  owner_id: string;
  start_time: Date | string;
  end_time: Date | string;
  duration_min: number;
  session_type: string;
  status?: string;
  name?: string | null;
  color?: string | null;
  participant_count?: number;
  session_participants?: SessionParticipantDoc[];
};

type UserSnippet = {
  id: string;
  email?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  about?: string | null;
  avatar_url?: string | null;
  emailVerified: boolean;
};

async function loadUsersById(
  db: Db,
  userIds: string[],
): Promise<Record<string, UserSnippet>> {
  const ids = Array.from(new Set(userIds)).filter((id) => ObjectId.isValid(id));
  if (ids.length === 0) return {};

  type DbUser = {
    _id: ObjectId;
    name?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    email?: string | null;
    username?: string | null;
    about?: string | null;
    image?: string | null;
    avatar_url?: string | null;
    emailVerified?: Date | string | null;
  };

  const users = (await db
    .collection<DbUser>("users")
    .find({ _id: { $in: ids.map((i) => new ObjectId(i)) } })
    .project({
      name: 1,
      firstname: 1,
      lastname: 1,
      email: 1,
      username: 1,
      about: 1,
      image: 1,
      avatar_url: 1,
      emailVerified: 1,
    })
    .toArray()) as unknown as DbUser[];

  return Object.fromEntries(
    users.map((u) => [
      String(u._id),
      {
        id: String(u._id),
        email: u.email ?? null,
        firstname:
          u.firstname ?? (u.name ? String(u.name).split(" ")[0] : null),
        lastname: u.lastname ?? null,
        username: u.username ?? null,
        about: u.about ?? null,
        avatar_url: u.avatar_url ?? u.image ?? null,
        emailVerified: isEmailVerified(u.emailVerified),
      },
    ]),
  );
}

export function toFetchedSession(
  doc: SessionRealtimeDoc,
  usersById: Record<string, UserSnippet> = {},
): FetchedSession {
  const start = new Date(doc.start_time);
  const end = new Date(doc.end_time);
  const count =
    typeof doc.participant_count === "number"
      ? doc.participant_count
      : (doc.session_participants?.length ?? 0);
  const now = new Date();

  let status: SessionStatus;
  if (now > end) status = "completed";
  else if (now >= start && now <= end) status = "in-progress";
  else if (count >= 2) status = "booked";
  else status = "available";

  return {
    id: String(doc._id),
    owner_id: doc.owner_id,
    start: start.toISOString(),
    end: end.toISOString(),
    durationMin: doc.duration_min as DurationMin,
    sessionType: doc.session_type as SessionType,
    name: null,
    color: doc.color ?? null,
    status,
    participants: (doc.session_participants ?? []).map((p) => {
      const u = usersById[p.user_id];
      return {
        user_id: p.user_id,
        joined_at:
          p.joined_at instanceof Date
            ? p.joined_at.toISOString()
            : p.joined_at
              ? String(p.joined_at)
              : new Date(0).toISOString(),
        email: u?.email ?? undefined,
        firstname: u?.firstname ?? undefined,
        lastname: u?.lastname ?? undefined,
        username: u?.username ?? undefined,
        about: u?.about ?? undefined,
        avatar_url: u?.avatar_url ?? undefined,
        emailVerified: u?.emailVerified ?? false,
        quiet: Boolean(p.quiet),
      };
    }),
    owner: usersById[doc.owner_id]
      ? {
          id: usersById[doc.owner_id].id,
          email: usersById[doc.owner_id].email ?? undefined,
          firstname: usersById[doc.owner_id].firstname ?? undefined,
          lastname: usersById[doc.owner_id].lastname ?? undefined,
          username: usersById[doc.owner_id].username ?? undefined,
          about: usersById[doc.owner_id].about ?? undefined,
          avatar_url: usersById[doc.owner_id].avatar_url ?? undefined,
          emailVerified: usersById[doc.owner_id].emailVerified,
        }
      : null,
  };
}

export async function publishSessionUpserted(
  session: FetchedSession,
): Promise<void> {
  const event: SessionUpsertedEvent = {
    type: "session_upserted",
    session,
  };
  await publishAbly(sessionsChannel(), event);
}

export async function publishSessionRemoved(sessionId: string): Promise<void> {
  const event: SessionRemovedEvent = {
    type: "session_removed",
    sessionId,
  };
  await publishAbly(sessionsChannel(), event);
}

/** Hydrate a session doc and publish session_upserted on Ably. */
export async function publishSessionDocUpserted(
  db: Db,
  doc: SessionRealtimeDoc,
): Promise<void> {
  const userIds = [doc.owner_id];
  for (const p of doc.session_participants ?? []) {
    userIds.push(p.user_id);
  }
  const usersById = await loadUsersById(db, userIds);
  await publishSessionUpserted(toFetchedSession(doc, usersById));
}
