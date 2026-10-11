import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";

// Must match the options in the app (src/app/onboarding.tsx).
const GENDERS = ["Woman", "Man", "Non-binary", "Self-describe", "Prefer not to say"];
const GENERATIONS = ["Gen Alpha", "Gen Z", "Millennial", "Gen X", "Baby Boomer", "Prefer not to say"];
const FOCUS = [
  "Studying",
  "Work",
  "Writing",
  "Coding",
  "Creative projects",
  "Job search",
  "Reading",
  "Admin & chores",
];

type MatchingProfileDoc = {
  gender?: string | null;
  generation?: string | null;
  focus?: string[];
  updatedAt?: Date;
};

type UserDoc = {
  _id: ObjectId;
  matchingProfile?: MatchingProfileDoc;
  onboardingSeenAt?: Date | null;
};

function toResponse(user: UserDoc | null) {
  const mp = user?.matchingProfile ?? {};
  return {
    matchingProfile: {
      gender: mp.gender ?? null,
      generation: mp.generation ?? null,
      focus: Array.isArray(mp.focus) ? mp.focus : [],
      onboardingSeenAt: user?.onboardingSeenAt ?? null,
    },
  };
}

async function currentUserId() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  return userId && ObjectId.isValid(userId) ? userId : null;
}

/** GET /api/users/me/matching-profile — private onboarding answers + tour state. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { matchingProfile: 1, onboardingSeenAt: 1 } },
  );
  return NextResponse.json(toResponse(user));
}

/**
 * PUT /api/users/me/matching-profile
 * Body (all optional): { gender, generation, focus, onboardingSeen }
 *  - gender / generation: one of the allowed values, or null to clear (skipped).
 *  - focus: array of allowed values ([] clears).
 *  - onboardingSeen: true records the first time the tour was shown.
 *
 * Deliberately NOT gated on a verified email: onboarding runs right after sign-up.
 * These answers are private: they are not returned by GET /api/users/me or any
 * public profile endpoint, and are only meant for matching.
 */
export async function PUT(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = (await req.json().catch(() => ({}))) as {
    gender?: unknown;
    generation?: unknown;
    focus?: unknown;
    onboardingSeen?: unknown;
  };

  const set: Record<string, unknown> = {};

  if (body.gender !== undefined) {
    if (body.gender !== null && !GENDERS.includes(String(body.gender))) {
      return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
    }
    set["matchingProfile.gender"] = body.gender ?? null;
  }
  if (body.generation !== undefined) {
    if (body.generation !== null && !GENERATIONS.includes(String(body.generation))) {
      return NextResponse.json({ error: "Invalid generation" }, { status: 400 });
    }
    set["matchingProfile.generation"] = body.generation ?? null;
  }
  if (body.focus !== undefined) {
    if (!Array.isArray(body.focus) || body.focus.some((f) => !FOCUS.includes(String(f)))) {
      return NextResponse.json({ error: "Invalid focus" }, { status: 400 });
    }
    set["matchingProfile.focus"] = [...new Set(body.focus.map(String))];
  }
  if (Object.keys(set).length > 0) {
    set["matchingProfile.updatedAt"] = new Date();
  }

  const db = await getDb();
  const users = db.collection<UserDoc>("users");
  const _id = new ObjectId(userId);

  if (Object.keys(set).length > 0) {
    await users.updateOne({ _id }, { $set: set });
  }
  // Keep the FIRST time the tour was seen.
  if (body.onboardingSeen === true) {
    await users.updateOne(
      { _id, onboardingSeenAt: { $exists: false } },
      { $set: { onboardingSeenAt: new Date() } },
    );
  }

  const user = await users.findOne(
    { _id },
    { projection: { matchingProfile: 1, onboardingSeenAt: 1 } },
  );
  return NextResponse.json(toResponse(user));
}
