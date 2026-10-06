import { ObjectId, type Db } from "mongodb";
import { areUsersBlocked } from "@/lib/blocking";
import { hasSessionOverlap } from "@/lib/sessionOverlap";
import { hasSessionStarted } from "@/lib/sessionWindow";
import { getPublicAttendanceByUserIds } from "@/lib/sessionAttendanceQuery";
import {
  countUpcomingSessionsForUser,
  userHasAttendedAnySession,
} from "@/lib/sessionAttendanceGate";
import { notifySessionCancelled } from "@/lib/notifySessionCancelled";
import { notifySessionMatched } from "@/lib/notifySessionMatched";
import {
  publishSessionDocUpserted,
  publishSessionRemoved,
} from "@/lib/sessionRealtime";

/** All rematch times are shown in IST. */
export const REMATCH_TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60 * 1000;
const SOON_MS = 30 * 60 * 1000;

type Participant = {
  user_id: string;
  joined_at?: Date | string;
  quiet?: boolean;
  label?: string | null;
};

export type SessionDoc = {
  _id: ObjectId;
  owner_id: string;
  start_time: Date;
  end_time: Date;
  duration_min?: number;
  session_type?: string;
  status?: string;
  name?: string | null;
  participant_count?: number;
  session_participants?: Participant[];
  created_at?: Date;
  updated_at?: Date;
};

type UserDoc = {
  _id: ObjectId;
  email?: string | null;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  communityBannedAt?: Date | null;
};

export type RematchPerson = {
  id: string;
  name: string;
  first: string;
  username: string | null;
  email: string | null;
  attended: string | null;
};

export type RematchSession = {
  id: string;
  /** Fingerprint used to detect changes between load and confirm. */
  version: string;
  ownerId: string;
  joinerId: string | null;
};

export type RematchSlot = {
  start: string;
  end: string;
  durationMin: number;
  state: "past" | "live" | "soon" | "upcoming";
  minutesToStart: number;
  sessions: RematchSession[];
};

export type RematchDay = {
  date: string;
  loadedAt: string;
  slots: RematchSlot[];
  people: Record<string, RematchPerson>;
  /** Pairs of user ids where one has blocked the other. */
  blocks: [string, string][];
};

const participantIds = (s: SessionDoc) =>
  (s.session_participants ?? []).map((p) => String(p.user_id));

export function sessionVersion(s: SessionDoc): string {
  return `${s.owner_id}|${participantIds(s).join(",")}`;
}

function displayName(u: UserDoc | undefined, fallback: string): { name: string; first: string } {
  const full =
    [u?.firstname, u?.lastname].filter(Boolean).join(" ").trim() ||
    u?.name?.trim() ||
    u?.username ||
    u?.email?.split("@")[0] ||
    fallback;
  const first = u?.firstname?.trim() || full.split(" ")[0];
  return { name: full, first };
}

/** UTC bounds of an IST calendar day given as YYYY-MM-DD. */
export function istDayBounds(date: string): { from: Date; to: Date } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const startUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - IST_OFFSET_MS;
  return { from: new Date(startUtc), to: new Date(startUtc + 24 * 60 * 60 * 1000) };
}

export function todayInIst(now = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export async function loadRematchDay(db: Db, date: string): Promise<RematchDay | null> {
  const bounds = istDayBounds(date);
  if (!bounds) return null;
  const now = new Date();

  const sessions = (await db
    .collection<SessionDoc>("sessions")
    .find({ start_time: { $gte: bounds.from, $lt: bounds.to } })
    .sort({ start_time: 1 })
    .toArray()) as SessionDoc[];

  const ids = [
    ...new Set(sessions.flatMap((s) => [String(s.owner_id), ...participantIds(s)])),
  ].filter((id) => ObjectId.isValid(id));

  const [users, attendance, blockDocs] = await Promise.all([
    db
      .collection<UserDoc>("users")
      .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } })
      .project({ email: 1, username: 1, firstname: 1, lastname: 1, name: 1 })
      .toArray() as Promise<UserDoc[]>,
    getPublicAttendanceByUserIds(db, ids, now),
    db
      .collection<{ blocker_id: string; blocked_id: string }>("user_blocks")
      .find({ blocker_id: { $in: ids }, blocked_id: { $in: ids } })
      .toArray(),
  ]);

  const byId = new Map(users.map((u) => [String(u._id), u]));
  const people: Record<string, RematchPerson> = {};
  for (const id of ids) {
    const u = byId.get(id);
    const { name, first } = displayName(u, "Unknown");
    const a = attendance[id];
    people[id] = {
      id,
      name,
      first,
      username: u?.username ?? null,
      email: u?.email ?? null,
      attended: a ? `${a.attended}/${a.booked}` : null,
    };
  }

  const slotMap = new Map<string, RematchSlot>();
  for (const s of sessions) {
    const parts = participantIds(s);
    if (parts.length === 0) continue;
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    const key = `${start.toISOString()}|${s.duration_min ?? 50}`;
    let slot = slotMap.get(key);
    if (!slot) {
      const toStart = start.getTime() - now.getTime();
      slot = {
        start: start.toISOString(),
        end: end.toISOString(),
        durationMin: s.duration_min ?? 50,
        state:
          end.getTime() <= now.getTime()
            ? "past"
            : toStart <= 0
              ? "live"
              : toStart <= SOON_MS
                ? "soon"
                : "upcoming",
        minutesToStart: Math.round(toStart / 60000),
        sessions: [],
      };
      slotMap.set(key, slot);
    }
    const ownerId = String(s.owner_id);
    slot.sessions.push({
      id: String(s._id),
      version: sessionVersion(s),
      ownerId,
      joinerId: parts.find((id) => id !== ownerId) ?? null,
    });
  }

  return {
    date,
    loadedAt: now.toISOString(),
    slots: [...slotMap.values()],
    people,
    blocks: blockDocs.map((b) => [String(b.blocker_id), String(b.blocked_id)]),
  };
}

// ── Mutations ─────────────────────────────────────────────────────────────

export type OwnerChoice = "handover" | "cancel";

export type RematchRequest =
  | {
      action: "move";
      sessionId: string;
      userId: string;
      targetSessionId: string;
      ownerChoice?: OwnerChoice;
    }
  | { action: "remove"; sessionId: string; userId: string; ownerChoice?: OwnerChoice }
  | { action: "club"; keepSessionId: string; absorbSessionId: string };

export type RematchOptions = {
  /** userId → send email? Missing ids default to true. */
  emails: Record<string, boolean>;
  note: string;
  /** sessionId → version seen when the page loaded. */
  expected: Record<string, string>;
};

export type CheckResult = { key: string; label: string; ok: boolean; detail?: string };

export type RematchOutcome =
  | {
      ok: true;
      lines: string[];
      mails: { userId: string; name: string; status: "sent" | "off" | "failed" }[];
      targetUserId: string;
    }
  | { ok: false; status: number; error: string; checks: CheckResult[] };

class Abort extends Error {
  constructor(
    public status: number,
    message: string,
    public checks: CheckResult[] = [],
  ) {
    super(message);
  }
}

const timeLabel = (d: Date) =>
  d.toLocaleString("en-US", {
    timeZone: REMATCH_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

async function loadNames(db: Db, ids: string[]) {
  const users = (await db
    .collection<UserDoc>("users")
    .find({ _id: { $in: ids.filter((i) => ObjectId.isValid(i)).map((i) => new ObjectId(i)) } })
    .project({ email: 1, username: 1, firstname: 1, lastname: 1, name: 1, communityBannedAt: 1 })
    .toArray()) as UserDoc[];
  const map = new Map(users.map((u) => [String(u._id), u]));
  return {
    user: (id: string) => map.get(id),
    first: (id: string) => displayName(map.get(id), "Someone").first,
    full: (id: string) => displayName(map.get(id), "Someone").name,
  };
}

function assertUnchanged(s: SessionDoc | null, id: string, expected: Record<string, string>, who: string) {
  if (!s) {
    throw new Abort(409, `${who}'s session no longer exists. Refresh to see the latest.`, [
      { key: "unchanged", label: "Sessions unchanged since the page loaded", ok: false },
    ]);
  }
  const want = expected[id];
  if (want && want !== sessionVersion(s)) {
    throw new Abort(409, `${who}'s session changed after this page loaded. No one was moved and no emails were sent.`, [
      { key: "unchanged", label: "Sessions unchanged since the page loaded", ok: false },
    ]);
  }
}

async function canStillBook(db: Db, userId: string, leavingSessionId: string | null): Promise<boolean> {
  if (await userHasAttendedAnySession(db, userId)) return true;
  const upcoming = await countUpcomingSessionsForUser(db, userId, new Date());
  // The session they're leaving doesn't count against them.
  return upcoming - (leavingSessionId ? 1 : 0) < 1;
}

async function publish(db: Db, doc: SessionDoc | null) {
  if (!doc) return;
  await publishSessionDocUpserted(db, {
    ...doc,
    duration_min: doc.duration_min ?? 50,
    session_type: doc.session_type ?? "focus",
  } as never);
}

/**
 * Take `userId` out of `src`. Returns the doc to restore on rollback and a
 * description of the partner's outcome.
 */
async function detach(
  db: Db,
  src: SessionDoc,
  userId: string,
  ownerChoice: OwnerChoice | undefined,
): Promise<{ partnerId: string | null; removed: boolean; after: SessionDoc | null }> {
  const col = db.collection<SessionDoc>("sessions");
  const isOwner = String(src.owner_id) === userId;
  const parts = src.session_participants ?? [];
  const partnerId = parts.map((p) => String(p.user_id)).find((id) => id !== userId) ?? null;
  const remaining = parts.filter((p) => String(p.user_id) !== userId);

  if (isOwner && ownerChoice === "cancel") {
    const res = await col.deleteOne({ _id: src._id, owner_id: src.owner_id });
    if (res.deletedCount !== 1) throw new Abort(409, "The session changed while applying. Nothing was changed.");
    return { partnerId, removed: true, after: null };
  }

  const set: Partial<SessionDoc> = {
    session_participants: remaining,
    participant_count: remaining.length,
    status: "available",
    updated_at: new Date(),
  };
  if (isOwner && partnerId) set.owner_id = partnerId;

  const res = await col.updateOne(
    { _id: src._id, owner_id: src.owner_id, "session_participants.user_id": userId },
    { $set: set },
  );
  if (res.modifiedCount !== 1) throw new Abort(409, "The session changed while applying. Nothing was changed.");
  return { partnerId, removed: false, after: await col.findOne({ _id: src._id }) };
}

async function restore(db: Db, original: SessionDoc) {
  await db.collection<SessionDoc>("sessions").replaceOne({ _id: original._id }, original, { upsert: true });
}

export async function runRematch(
  db: Db,
  req: RematchRequest,
  opts: RematchOptions,
): Promise<RematchOutcome> {
  try {
    return await run(db, req, opts);
  } catch (err) {
    if (err instanceof Abort) {
      return { ok: false, status: err.status, error: err.message, checks: err.checks };
    }
    throw err;
  }
}

async function run(db: Db, req: RematchRequest, opts: RematchOptions): Promise<RematchOutcome> {
  const col = db.collection<SessionDoc>("sessions");
  const note = opts.note.trim().slice(0, 500);
  const wants = (id: string) => opts.emails[id] !== false;
  const now = new Date();

  if (req.action === "club") {
    const [keep, absorb] = await Promise.all([
      col.findOne({ _id: new ObjectId(req.keepSessionId) }),
      col.findOne({ _id: new ObjectId(req.absorbSessionId) }),
    ]);
    const a = keep ? String(keep.owner_id) : "";
    const b = absorb ? String(absorb.owner_id) : "";
    const names = await loadNames(db, [a, b].filter(Boolean));
    assertUnchanged(keep, req.keepSessionId, opts.expected, names.first(a));
    assertUnchanged(absorb, req.absorbSessionId, opts.expected, names.first(b));
    if (participantIds(keep!).length !== 1 || participantIds(absorb!).length !== 1) {
      throw new Abort(409, "Both sessions must be open slots.");
    }
    if (new Date(keep!.start_time).getTime() !== new Date(absorb!.start_time).getTime()) {
      throw new Abort(409, "Both sessions must start at the same time.");
    }
    if (hasSessionStarted(keep!.start_time, now)) throw new Abort(400, "This slot has already started.");
    const checks: CheckResult[] = [
      { key: "blocked", label: `${names.first(a)} and ${names.first(b)} haven't blocked each other`, ok: !(await areUsersBlocked(a, b)) },
      { key: "banned", label: "Both are allowed to book (not banned or restricted)", ok: !names.user(a)?.communityBannedAt && !names.user(b)?.communityBannedAt },
      { key: "unchanged", label: "Both slots unchanged since the page loaded", ok: true },
    ];
    if (checks.some((c) => !c.ok)) throw new Abort(409, "A safety check failed. Nothing was changed.", checks);

    const absorbPart = (absorb!.session_participants ?? [])[0];
    const booked = await col.findOneAndUpdate(
      { _id: keep!._id, participant_count: { $ne: 2 }, "session_participants.1": { $exists: false } },
      {
        $push: { session_participants: { user_id: b, joined_at: new Date(), quiet: absorbPart?.quiet ?? false } } as never,
        $set: { status: "booked", participant_count: 2, updated_at: new Date() },
      },
      { returnDocument: "after" },
    );
    if (!booked) throw new Abort(409, `${names.first(a)}'s slot filled while applying. Nothing was changed.`);
    await col.deleteOne({ _id: absorb!._id });
    await publishSessionRemoved(String(absorb!._id));
    await publish(db, booked);

    const recipients = [a, b].filter(wants);
    const { sentTo } = recipients.length
      ? await notifySessionMatched(db, booked, { recipients, teamNote: note, skipDedupe: true })
      : { sentTo: [] as string[] };
    const mails = [a, b].map((id) => ({
      userId: id,
      name: names.full(id),
      status: (!wants(id) ? "off" : sentTo.includes(id) ? "sent" : "failed") as "sent" | "off" | "failed",
    }));
    return {
      ok: true,
      targetUserId: a,
      mails,
      lines: [
        `${timeLabel(new Date(keep!.start_time))} IST`,
        `${names.first(a)} (open) + ${names.first(b)} (open) → ${names.first(a)} ↔ ${names.first(b)}`,
        emailedLine(mails, note),
      ],
    };
  }

  // move / remove
  const src = await col.findOne({ _id: new ObjectId(req.sessionId) });
  const m = req.userId;
  const srcIds = src ? participantIds(src) : [];
  const isOwner = src ? String(src.owner_id) === m : false;
  const partner = srcIds.find((id) => id !== m) ?? null;
  const target = req.action === "move" ? await col.findOne({ _id: new ObjectId(req.targetSessionId) }) : null;
  const t = target ? String(target.owner_id) : null;
  const names = await loadNames(db, [m, partner, t].filter(Boolean) as string[]);

  assertUnchanged(src, req.sessionId, opts.expected, partner ? names.first(partner) : names.first(m));
  if (!srcIds.includes(m)) throw new Abort(409, `${names.first(m)} is no longer in that session.`);
  if (srcIds.length < 2) throw new Abort(409, `${names.first(m)} isn't in a matched pair anymore.`);
  if (isOwner && partner && !req.ownerChoice) {
    throw new Abort(400, `${names.first(m)} owns this session. Choose hand over or cancel first.`);
  }
  if (hasSessionStarted(src!.start_time, now)) throw new Abort(400, "This session has already started.");

  if (req.action === "move") {
    assertUnchanged(target, req.targetSessionId, opts.expected, t ? names.first(t) : "The target");
    if (participantIds(target!).length !== 1) throw new Abort(409, `${names.first(t!)}'s slot is no longer open.`);
    if (new Date(target!.start_time).getTime() !== new Date(src!.start_time).getTime()) {
      throw new Abort(409, "Rematching only works inside the same time slot.");
    }
    const start = new Date(target!.start_time);
    const end = new Date(target!.end_time);
    const overlapElsewhere = await db.collection("sessions").findOne(
      {
        _id: { $nin: [src!._id, target!._id] },
        "session_participants.user_id": m,
        start_time: { $lt: end },
        end_time: { $gt: start },
      },
      { projection: { _id: 1 } },
    );
    const checks: CheckResult[] = [
      { key: "blocked", label: `${names.first(m)} and ${names.first(t!)} haven't blocked each other`, ok: !(await areUsersBlocked(m, t!)) },
      { key: "overlap", label: `${names.first(m)} has no other session that clashes`, ok: !overlapElsewhere },
      { key: "banned", label: `${names.first(m)} is allowed to book (not banned or restricted)`, ok: !names.user(m)?.communityBannedAt && (await canStillBook(db, m, req.sessionId)) },
      { key: "unchanged", label: "Both sessions unchanged since the page loaded", ok: true },
    ];
    if (checks.some((c) => !c.ok)) throw new Abort(409, "A safety check failed. Nothing was changed.", checks);
  }

  const original = { ...src! };
  const detached = await detach(db, src!, m, req.ownerChoice);

  let booked: SessionDoc | null = null;
  if (req.action === "move") {
    booked = await col.findOneAndUpdate(
      {
        _id: target!._id,
        owner_id: target!.owner_id,
        participant_count: { $ne: 2 },
        "session_participants.1": { $exists: false },
        "session_participants.user_id": { $ne: m },
      },
      {
        $push: { session_participants: { user_id: m, joined_at: new Date(), quiet: false } } as never,
        $set: { status: "booked", participant_count: 2, updated_at: new Date() },
      },
      { returnDocument: "after" },
    );
    if (!booked) {
      await restore(db, original);
      throw new Abort(409, `${names.first(t!)}'s slot filled while applying. ${names.first(m)} was put back; no emails were sent.`, [
        { key: "unchanged", label: "Both sessions unchanged since the page loaded", ok: false },
      ]);
    }
    // Defensive: make sure no stray overlap appeared mid-way.
    if (await hasSessionOverlap(db, m, new Date(booked.start_time), new Date(booked.end_time), String(booked._id))) {
      console.warn("[admin/rematch] overlap detected after move", { userId: m, sessionId: String(booked._id) });
    }
  }

  // Realtime
  if (detached.removed) await publishSessionRemoved(String(original._id));
  else await publish(db, detached.after);
  if (booked) await publish(db, booked);

  // Emails
  const mails: { userId: string; name: string; status: "sent" | "off" | "failed" }[] = [];
  if (partner) {
    let status: "sent" | "off" | "failed" = "off";
    if (wants(partner)) {
      const res = await notifySessionCancelled(
        db,
        { session: original as never, actorUserId: m, message: "", kind: detached.removed ? "delete" : "leave" },
        { teamNote: note },
      );
      status = res.sent ? "sent" : "failed";
    }
    mails.push({ userId: partner, name: names.full(partner), status });
  }
  if (booked && t) {
    const recipients = [t, m].filter(wants);
    const { sentTo } = recipients.length
      ? await notifySessionMatched(db, booked, { recipients, teamNote: note, skipDedupe: true })
      : { sentTo: [] as string[] };
    for (const id of [t, m]) {
      mails.push({ userId: id, name: names.full(id), status: !wants(id) ? "off" : sentTo.includes(id) ? "sent" : "failed" });
    }
  }

  const f = names.first;
  const pair = partner ? (isOwner ? `${f(m)} ↔ ${f(partner)}` : `${f(partner)} ↔ ${f(m)}`) : f(m);
  const partnerAfter = !partner
    ? `${f(m)}'s slot removed`
    : detached.removed
      ? `${f(partner)}'s session removed`
      : `${f(partner)} (open)`;
  const lines = [`${timeLabel(new Date(original.start_time))} IST`, `${pair} → ${partnerAfter}`];
  if (booked && t) lines.push(`${f(t)} (open) → ${f(t)} ↔ ${f(m)}`);
  if (isOwner && partner) lines.push(req.ownerChoice === "cancel" ? "Owner choice: cancelled" : `Owner choice: handed to ${f(partner)}`);
  lines.push(emailedLine(mails, note));

  return { ok: true, targetUserId: m, mails, lines };
}

function emailedLine(mails: { name: string; status: string }[], note: string): string {
  const sent = mails.filter((x) => x.status === "sent").map((x) => x.name.split(" ")[0]);
  if (!sent.length) return "No emails sent";
  return `Emailed ${sent.join(", ")}${note ? " · note added" : ""}`;
}
