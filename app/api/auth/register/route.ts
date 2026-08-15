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

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (isDisposableEmail(normalizedEmail)) {
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

    after(() =>
      sendWelcomeVerificationEmail({
        userId,
        email: doc.email,
        firstName: doc.firstname,
      }).catch((err) => {
        console.error("[register] Welcome email failed:", err);
      }),
    );

    after(() =>
      import("@/lib/welcomeAnnouncements")
        .then(({ createWelcomeAnnouncement }) =>
          createWelcomeAnnouncement({
            userId,
            username: doc.username,
            displayName: doc.firstname || doc.name || doc.username,
            avatarUrl: null,
          }),
        )
        .catch((err) => {
          console.error("[register] Welcome board announcement failed:", err);
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
