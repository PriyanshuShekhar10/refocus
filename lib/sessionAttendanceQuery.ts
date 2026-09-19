/**
 * Server-only attendance lookups. Matches session_participants.user_id
 * whether it was stored as a string or an ObjectId.
 *
 * Public attendance is stored on the user document and reused for ~15 minutes
 * so calendar/profile reads stay cheap. Stale values are fine to show.
 */

import { after } from "next/server";
import { ObjectId, type Db } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  accumulateAttendanceStats,
  toPublicAttendance,
  type AttendanceSessionInput,
  type AttendanceTotals,
  type PublicAttendance,
} from "@/lib/sessionAttendanceStats";

export const PUBLIC_ATTENDANCE_TTL_MS = 15 * 60 * 1000;
const MAX_BACKGROUND_REFRESH = 40;

export type StoredPublicAttendanceFields = {
  publicAttendance?: PublicAttendance | null;
  publicAttendanceAt?: Date | string | null;
};

export type StoredAttendanceRead = {
  attendance: PublicAttendance | null;
  computedAt: Date | null;
  fresh: boolean;
};

type SessionAttendanceDoc = {
  owner_id?: unknown;
  session_participants?: Array<{
    user_id?: unknown;
    call_joined_at?: Date | string | null;
    call_completed?: boolean | null;
  }>;
};

function asObjectId(id: string): ObjectId | null {
  if (!ObjectId.isValid(id)) return null;
  const oid = new ObjectId(id);
  return String(oid) === id ? oid : null;
}

/** Match session_participants.user_id whether it was stored as a string or ObjectId. */
export function sessionParticipantIdValues(
  userId: string,
): Array<string | ObjectId> {
  const id = String(userId);
  const values: Array<string | ObjectId> = [id];
  const oid = asObjectId(id);
  if (oid) values.push(oid);
  return values;
}

function participantUserKey(userId: unknown): string {
  return String(userId ?? "");
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function normalizePublicAttendance(value: unknown): PublicAttendance | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const percent = Number(rec.percent);
  const booked = Number(rec.booked);
  const attended = Number(rec.attended);
  if (!Number.isFinite(percent) || !Number.isFinite(booked) || !Number.isFinite(attended)) {
    return null;
  }
  if (booked <= 0) return null;
  return { percent, booked, attended };
}

export function readStoredPublicAttendance(
  user: unknown,
  now = new Date(),
): StoredAttendanceRead {
  const rec =
    user && typeof user === "object"
      ? (user as StoredPublicAttendanceFields)
      : null;
  const computedAt = toDate(rec?.publicAttendanceAt);
  return {
    attendance: normalizePublicAttendance(rec?.publicAttendance),
    computedAt,
    fresh: Boolean(
      computedAt && now.getTime() - computedAt.getTime() < PUBLIC_ATTENDANCE_TTL_MS,
    ),
  };
}

async function persistPublicAttendance(
  db: Db,
  entries: Array<{ userId: string; attendance: PublicAttendance | null }>,
  now = new Date(),
): Promise<void> {
  const ops = entries.flatMap((entry) => {
    const oid = asObjectId(entry.userId);
    if (!oid) return [];
    return [
      {
        updateOne: {
          filter: { _id: oid },
          update: {
            $set: {
              publicAttendance: entry.attendance,
              publicAttendanceAt: now,
            },
          },
        },
      },
    ];
  });
  if (ops.length === 0) return;
  await db.collection("users").bulkWrite(ops, { ordered: false });
}

async function loadEndedSessionsForUsers(
  db: Db,
  userIds: string[],
  now: Date,
): Promise<SessionAttendanceDoc[]> {
  const unique = [...new Set(userIds.map(String).filter(Boolean))];
  if (unique.length === 0) return [];

  const idValues = unique.flatMap(sessionParticipantIdValues);

  return (await db
    .collection("sessions")
    .find({
      end_time: { $lt: now },
      "session_participants.user_id": { $in: idValues },
    })
    .project({ owner_id: 1, session_participants: 1 })
    .toArray()) as SessionAttendanceDoc[];
}

export async function getPublicAttendanceByUserIds(
  db: Db,
  userIds: string[],
  now = new Date(),
): Promise<Record<string, PublicAttendance>> {
  const unique = [...new Set(userIds.map(String).filter(Boolean))];
  const docs = await loadEndedSessionsForUsers(db, unique, now);
  const out: Record<string, PublicAttendance> = {};

  for (const id of unique) {
    const inputs: AttendanceSessionInput[] = [];
    for (const doc of docs) {
      const participants = doc.session_participants ?? [];
      const me = participants.find((p) => participantUserKey(p.user_id) === id);
      if (!me) continue;
      inputs.push({
        participantCount: participants.length,
        ownerId: String(doc.owner_id ?? ""),
        didAttend: Boolean(me.call_joined_at),
        didComplete: Boolean(me.call_completed),
      });
    }
    const pub = toPublicAttendance(accumulateAttendanceStats(inputs, id));
    if (pub) out[id] = pub;
  }

  return out;
}

export async function getAttendanceTotalsForUser(
  db: Db,
  userId: string,
  now = new Date(),
): Promise<AttendanceTotals> {
  const id = String(userId);
  const docs = await loadEndedSessionsForUsers(db, [id], now);
  const inputs: AttendanceSessionInput[] = docs.map((doc) => {
    const participants = doc.session_participants ?? [];
    const me = participants.find((p) => participantUserKey(p.user_id) === id);
    return {
      participantCount: participants.length,
      ownerId: String(doc.owner_id ?? ""),
      didAttend: Boolean(me?.call_joined_at),
      didComplete: Boolean(me?.call_completed),
    };
  });

  return accumulateAttendanceStats(inputs, id);
}

export async function refreshAndStorePublicAttendance(
  db: Db,
  userIds: string[],
  now = new Date(),
): Promise<Record<string, PublicAttendance>> {
  const unique = [...new Set(userIds.map(String).filter(Boolean))];
  if (unique.length === 0) return {};
  const computed = await getPublicAttendanceByUserIds(db, unique, now);
  await persistPublicAttendance(
    db,
    unique.map((id) => ({ userId: id, attendance: computed[id] ?? null })),
    now,
  );
  return computed;
}

export function schedulePublicAttendanceRefresh(userIds: string[]): void {
  const ids = [...new Set(userIds.map(String).filter(Boolean))].slice(
    0,
    MAX_BACKGROUND_REFRESH,
  );
  if (ids.length === 0) return;
  after(async () => {
    try {
      const db = await getDb();
      await refreshAndStorePublicAttendance(db, ids);
    } catch (err) {
      console.warn("[attendance] background refresh failed", err);
    }
  });
}

export async function resolvePublicAttendanceForUser(
  db: Db,
  userId: string,
  stored?: unknown,
): Promise<PublicAttendance | null> {
  const cached = readStoredPublicAttendance(stored);
  if (cached.computedAt) {
    if (!cached.fresh) schedulePublicAttendanceRefresh([userId]);
    return cached.attendance;
  }
  const attendance = toPublicAttendance(
    await getAttendanceTotalsForUser(db, userId),
  );
  await persistPublicAttendance(db, [{ userId, attendance }]);
  return attendance;
}
