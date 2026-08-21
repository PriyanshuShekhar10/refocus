import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { canonicalEmail } from "@/lib/normalizeEmail";
import { resolveEngagementCrewMembers } from "@/lib/engagementCrew";

type Participant = {
  user_id?: string;
  label?: string | null;
  joined_at?: Date | string | null;
  call_joined_at?: Date | string | null;
  call_completed?: boolean;
};

export type CrewSessionRow = {
  id: string;
  startTime: string | null;
  endTime: string | null;
  durationMin: number | null;
  sessionType: string;
  /** Calendar fill: available | booked */
  bookingStatus: string;
  /** Their role on this session */
  role: "created" | "joined";
  /** Partner label if any */
  partner: string | null;
  matched: boolean;
  /** Personal outcome for this crew member */
  status:
    | "upcoming"
    | "in-progress"
    | "open"
    | "finished"
    | "attended"
    | "missed"
    | "unmatched";
};

function partnerLabel(
  participants: Participant[],
  meId: string,
  byId: Record<string, string>,
): string | null {
  const other = participants.find((p) => p.user_id && String(p.user_id) !== meId);
  if (!other?.user_id) return null;
  return byId[String(other.user_id)] ?? other.label ?? "Partner";
}

function personalStatus(params: {
  now: Date;
  start: Date | null;
  end: Date | null;
  matched: boolean;
  me: Participant | undefined;
}): CrewSessionRow["status"] {
  const { now, start, end, matched, me } = params;
  const ended = Boolean(end && end.getTime() < now.getTime());
  const inProgress = Boolean(
    start &&
      end &&
      start.getTime() <= now.getTime() &&
      end.getTime() >= now.getTime(),
  );

  if (!ended) {
    if (inProgress) return "in-progress";
    if (!matched) return "open";
    return "upcoming";
  }

  if (!matched) return "unmatched";
  if (me?.call_completed) return "finished";
  if (me?.call_joined_at) return "attended";
  return "missed";
}

/**
 * Sessions for a crew roster email. Returns [] if email is not on the crew
 * or the user has not registered yet.
 */
export async function getCrewMemberSessions(params: {
  email: string;
  limit?: number;
}): Promise<{
  email: string;
  userId: string | null;
  sessions: CrewSessionRow[];
}> {
  const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 40)));
  const email = params.email.trim().toLowerCase();
  const canonical = canonicalEmail(email);

  const roster = await resolveEngagementCrewMembers();
  const member = roster.find(
    (m) =>
      m.email.toLowerCase() === email ||
      m.canonicalEmail === canonical,
  );
  if (!member) {
    return { email, userId: null, sessions: [] };
  }
  if (!member.userId) {
    return { email: member.email, userId: null, sessions: [] };
  }

  const userId = member.userId;
  const db = await getDb();
  const rows = await db
    .collection("sessions")
    .find({
      $or: [
        { owner_id: userId },
        { "session_participants.user_id": userId },
      ],
    })
    .sort({ start_time: -1 })
    .limit(limit)
    .toArray();

  const otherIds = [
    ...new Set(
      rows.flatMap((s) => {
        const parts = (s.session_participants as Participant[]) ?? [];
        return parts
          .map((p) => (p.user_id ? String(p.user_id) : null))
          .filter((id): id is string => Boolean(id) && id !== userId);
      }),
    ),
  ].filter((id) => ObjectId.isValid(id));

  const users = otherIds.length
    ? await db
        .collection("users")
        .find(
          { _id: { $in: otherIds.map((id) => new ObjectId(id)) } },
          {
            projection: {
              email: 1,
              username: 1,
              name: 1,
              firstname: 1,
              lastname: 1,
            },
          },
        )
        .toArray()
    : [];

  const byId: Record<string, string> = {};
  for (const u of users) {
    const firstname = typeof u.firstname === "string" ? u.firstname : "";
    const lastname = typeof u.lastname === "string" ? u.lastname : "";
    byId[String(u._id)] =
      [firstname, lastname].filter(Boolean).join(" ") ||
      (typeof u.name === "string" ? u.name : null) ||
      (typeof u.username === "string" ? `@${u.username}` : null) ||
      (typeof u.email === "string" ? u.email : null) ||
      "Partner";
  }

  const now = new Date();
  const sessions: CrewSessionRow[] = rows.map((s) => {
    const participants = (s.session_participants as Participant[]) ?? [];
    const me = participants.find((p) => String(p.user_id) === userId);
    const matched = participants.length >= 2;
    const start = s.start_time ? new Date(s.start_time as Date) : null;
    const end = s.end_time ? new Date(s.end_time as Date) : null;
    const isOwner = String(s.owner_id) === userId;

    return {
      id: String(s._id),
      startTime:
        start && !Number.isNaN(start.getTime()) ? start.toISOString() : null,
      endTime: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
      durationMin:
        typeof s.duration_min === "number" ? s.duration_min : null,
      sessionType:
        typeof s.session_type === "string" ? s.session_type : "focus",
      bookingStatus:
        typeof s.status === "string"
          ? s.status
          : matched
            ? "booked"
            : "available",
      role: isOwner ? "created" : "joined",
      partner: partnerLabel(participants, userId, byId),
      matched,
      status: personalStatus({ now, start, end, matched, me }),
    };
  });

  return { email: member.email, userId, sessions };
}
