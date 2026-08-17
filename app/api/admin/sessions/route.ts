import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

const MAX_LIMIT = 80;

type SessionParticipant = {
  user_id?: string;
  label?: string | null;
  call_joined_at?: Date | string | null;
  call_completed?: boolean;
};

function userLabel(u: unknown): string {
  if (!u || typeof u !== "object") return "Unknown";
  const rec = u as Record<string, unknown>;
  const firstname = typeof rec.firstname === "string" ? rec.firstname : "";
  const lastname = typeof rec.lastname === "string" ? rec.lastname : "";
  const name = typeof rec.name === "string" ? rec.name : null;
  const username = typeof rec.username === "string" ? rec.username : null;
  const email = typeof rec.email === "string" ? rec.email : null;
  return (
    [firstname, lastname].filter(Boolean).join(" ") ||
    name ||
    (username ? `@${username}` : null) ||
    email ||
    "Unknown"
  );
}

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "50", 10) || 50,
    MAX_LIMIT,
  );
  const scope = searchParams.get("scope") === "done" ? "done" : "upcoming";

  const db = await getDb();
  const now = new Date();
  const filter =
    scope === "done" ? { end_time: { $lt: now } } : { end_time: { $gte: now } };

  const [rows, total] = await Promise.all([
    db
      .collection("sessions")
      .find(filter)
      .sort({ start_time: scope === "done" ? -1 : 1 })
      .limit(limit)
      .toArray(),
    db.collection("sessions").countDocuments(filter),
  ]);

  const userIds = [
    ...new Set(
      rows.flatMap((s) => {
        const ids: string[] = [];
        if (typeof s.owner_id === "string") ids.push(s.owner_id);
        for (const p of (s.session_participants as SessionParticipant[]) ?? []) {
          if (p.user_id) ids.push(p.user_id);
        }
        return ids;
      }),
    ),
  ].filter((id) => ObjectId.isValid(id));

  const users = userIds.length
    ? await db
        .collection("users")
        .find(
          { _id: { $in: userIds.map((id) => new ObjectId(id)) } },
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

  const byId = Object.fromEntries(
    users.map((u) => [
      String(u._id),
      {
        id: String(u._id),
        label: userLabel(u),
        username: typeof u.username === "string" ? u.username : null,
        email: typeof u.email === "string" ? u.email : null,
      },
    ]),
  );

  return NextResponse.json({
    total,
    scope,
    sessions: rows.map((s) => {
      const storedParticipants =
        (s.session_participants as SessionParticipant[]) ?? [];
      const participantIds = [
        ...new Set(
          [
            typeof s.owner_id === "string" ? s.owner_id : null,
            ...storedParticipants.map((p) => p.user_id ?? null),
          ].filter((id): id is string => Boolean(id)),
        ),
      ];
      const participants = participantIds.map((id) => {
        const stored = storedParticipants.find((p) => p.user_id === id);
        const attended = Boolean(stored?.call_joined_at);
        const completed = Boolean(stored?.call_completed);
        return {
          ...(byId[id] ?? {
            id,
            label: stored?.label || id,
            username: null,
            email: null,
          }),
          attended,
          completed,
        };
      });
      const start = s.start_time ? new Date(s.start_time as Date) : null;
      const end = s.end_time ? new Date(s.end_time as Date) : null;
      const inProgress = Boolean(
        start &&
          end &&
          start.getTime() <= now.getTime() &&
          end.getTime() >= now.getTime(),
      );
      const ended = Boolean(end && end.getTime() < now.getTime());
      const completedCount = participants.filter((p) => p.completed).length;
      const attendedCount = participants.filter((p) => p.attended).length;
      let completion: string;
      if (!ended) {
        completion = inProgress
          ? "in-progress"
          : participants.length >= 2
            ? "matched"
            : "open";
      } else if (participants.length < 2) {
        completion = "unmatched";
      } else if (completedCount >= 2) {
        completion = "completed";
      } else if (completedCount === 1) {
        completion = "partial";
      } else if (attendedCount > 0) {
        completion = "left-early";
      } else {
        completion = "missed";
      }
      const names = participants.map((p) => p.label);
      const between =
        names.length >= 2
          ? names.join(" ↔ ")
          : names.length === 1
            ? `Open slot · ${names[0]}`
            : "No participants";

      return {
        id: String(s._id),
        startTime:
          start && !Number.isNaN(start.getTime()) ? start.toISOString() : null,
        endTime: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
        durationMin: s.duration_min ?? null,
        sessionType: s.session_type ?? "focus",
        status: s.status ?? (participants.length >= 2 ? "booked" : "open"),
        inProgress,
        between,
        completion,
        completedCount,
        attendedCount,
        participants,
      };
    }),
  });
}
