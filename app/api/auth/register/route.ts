import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/ratelimit";
import { validatePassword } from "@/lib/validatePassword";
import { sendWelcomeVerificationEmail } from "@/lib/email/sendWelcomeEmail";
import { generateUsername } from "@/lib/users/generateUsername";
import {
  DISPOSABLE_EMAIL_ERROR,
  isDisposableEmail,
} from "@/lib/disposableEmail";
import {
  BANNED_EMAIL_ERROR,
  canonicalEmail,
  displayEmail,
} from "@/lib/normalizeEmail";
import { findUserByEmailIdentity, isEmailBanned } from "@/lib/bannedEmails";
import { logBannedIpSignupAttempt } from "@/lib/bannedIpWatch";
import { recordSignupIp } from "@/lib/userIps";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimitResult = await checkRateLimit(ip, "auth");
  if (!rateLimitResult.success) {
    return rateLimitedResponse(rateLimitResult);
  }

  const body = await req.json().catch(() => ({}));
  const { email, password, name, firstName, lastName } = body as {
    email?: string;
    password?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  if (!email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const normalizedEmail = displayEmail(String(email));
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (await isDisposableEmail(normalizedEmail)) {
    void logBannedIpSignupAttempt({
      ip,
      attemptedEmail: normalizedEmail,
      outcome: "rejected_other",
    });
    return NextResponse.json(
      { error: DISPOSABLE_EMAIL_ERROR },
      { status: 400 },
    );
  }

  // Validate password strength
  const { strength, requirements } = validatePassword(password);
  if (strength === "weak") {
    return NextResponse.json(
      {
        error: "Password is too weak",
        requirements,
      },
      { status: 400 }
    );
  }

  if (await isEmailBanned(normalizedEmail)) {
    void logBannedIpSignupAttempt({
      ip,
      attemptedEmail: normalizedEmail,
      outcome: "rejected_email",
    });
    return NextResponse.json({ error: BANNED_EMAIL_ERROR }, { status: 403 });
  }

  const existing = await findUserByEmailIdentity(normalizedEmail);
  if (existing) {
    void logBannedIpSignupAttempt({
      ip,
      attemptedEmail: normalizedEmail,
      outcome: "rejected_other",
    });
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const db = await getDb();
  const usersCol = db.collection("users");

  const hashedPassword = await bcrypt.hash(password, 10);
  const firstname = (firstName ?? name ?? "").trim() || null;
  const lastname = (lastName ?? "").trim() || null;
  const fullName =
    [firstname || undefined, lastname || undefined].filter(Boolean).join(" ") ||
    null;

  const username = await generateUsername(usersCol, normalizedEmail);

  const doc = {
    email: normalizedEmail,
    canonicalEmail: canonicalEmail(normalizedEmail),
    username,
    name: fullName,
    firstname,
    lastname,
    hashedPassword,
    emailVerified: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const res = await db.collection("users").insertOne(doc);
    const userId = String(res.insertedId);

    void recordSignupIp(userId, ip);
    void logBannedIpSignupAttempt({
      ip,
      attemptedEmail: normalizedEmail,
      outcome: "created",
      createdUserId: userId,
    });

    // Create welcome board announcement before responding so it exists
    // when the new user (or others) open Community.
    try {
      const { createWelcomeAnnouncement } = await import(
        "@/lib/welcomeAnnouncements"
      );
      await createWelcomeAnnouncement({
        userId,
        username: doc.username,
        displayName: doc.firstname || doc.name || doc.username,
        avatarUrl: null,
        createdAt: doc.createdAt,
      });
    } catch (err) {
      console.error("[register] Welcome board announcement failed:", err);
    }

    after(() =>
      sendWelcomeVerificationEmail({
        userId,
        email: doc.email,
        firstName: doc.firstname,
      }).catch((emailErr) => {
        console.error("[register] Welcome email failed:", emailErr);
      }),
    );

    return NextResponse.json({ id: userId });
  } catch (e: unknown) {
    // MongoDB duplicate key error code is 11000
    if (e instanceof Error && "code" in e && (e as { code: number }).code === 11000) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }
    throw e;
  }
}
