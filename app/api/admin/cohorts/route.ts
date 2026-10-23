import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { canonicalEmail } from "@/lib/normalizeEmail";
import {
  COHORT_TRACKING_START,
  computeCohortRetention,
  type CohortSessionTouch,
  type CohortUser,
} from "@/lib/cohortRetention";

const DEMO_EMAIL = "demo@refocus.co.in";

type UserDoc = {
  _id: unknown;
  createdAt?: Date;
  role?: string;
  email?: string;
};

type ParticipantDoc = {
  user_id: string;
  call_joined_at?: Date | string;
};

type SessionDoc = {
  session_participants?: ParticipantDoc[];
};

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const db = await getDb();

  const [users, crewDocs] = await Promise.all([
    db
      .collection<UserDoc>("users")
      .find({}, { projection: { createdAt: 1, role: 1, email: 1 } })
      .toArray(),
    db
      .collection<{ userId?: string; canonicalEmail?: string }>("engagement_crew")
      .find({}, { projection: { userId: 1, canonicalEmail: 1 } })
      .toArray(),
  ]);

  const crewUserIds = new Set(crewDocs.map((c) => c.userId).filter(Boolean));
  const crewEmails = new Set(crewDocs.map((c) => c.canonicalEmail).filter(Boolean));

  let excludedAdmin = 0;
  let excludedDemo = 0;
  let excludedCrew = 0;
  let excludedPreTracking = 0;

  const eligible: CohortUser[] = [];
  const eligibleIds = new Set<string>();
  for (const u of users) {
    const id = String(u._id);
    const email = (u.email || "").trim().toLowerCase();
    if (u.role === "admin") {
      excludedAdmin += 1;
      continue;
    }
    if (email === DEMO_EMAIL) {
      excludedDemo += 1;
      continue;
    }
    if (crewUserIds.has(id) || crewEmails.has(canonicalEmail(email))) {
      excludedCrew += 1;
      continue;
    }
    if (!u.createdAt || new Date(u.createdAt) < COHORT_TRACKING_START) {
      excludedPreTracking += 1;
      continue;
    }
    eligible.push({ id, createdAt: new Date(u.createdAt) });
    eligibleIds.add(id);
  }

  const sessions = await db
    .collection<SessionDoc>("sessions")
    .find(
      { "session_participants.user_id": { $in: [...eligibleIds] } },
      { projection: { "session_participants.user_id": 1, "session_participants.call_joined_at": 1 } },
    )
    .toArray();

  const touchesByUser = new Map<string, CohortSessionTouch[]>();
  for (const s of sessions) {
    const participants = s.session_participants ?? [];
    const partnered = participants.length >= 2;
    for (const p of participants) {
      const uid = String(p.user_id);
      if (!eligibleIds.has(uid)) continue;
      const list = touchesByUser.get(uid) ?? [];
      list.push({
        partnered,
        callJoinedAt: p.call_joined_at ? new Date(p.call_joined_at) : null,
      });
      touchesByUser.set(uid, list);
    }
  }

  const cohorts = computeCohortRetention(eligible, touchesByUser, new Date());

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    excluded: {
      admin: excludedAdmin,
      demo: excludedDemo,
      crew: excludedCrew,
      preTracking: excludedPreTracking,
    },
    cohorts,
  });
}
