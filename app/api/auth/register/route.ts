import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/ratelimit";
import { validatePassword } from "@/lib/validatePassword";

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
    return NextResponse.json(
      { error: "Missing email or password" },
      { status: 400 }
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

  // Ensure unique indexes exist (idempotent)
  await Promise.all([
    usersCol.createIndex({ email: 1 }, { unique: true }),
    usersCol.createIndex({ username: 1 }, { unique: true, sparse: true }),
  ]);

  const hashedPassword = await bcrypt.hash(password, 10);
  const firstname = (firstName ?? name ?? "").trim() || null;
  const lastname = (lastName ?? "").trim() || null;
  const fullName =
    [firstname || undefined, lastname || undefined].filter(Boolean).join(" ") ||
    null;

  // Auto-generate username from email prefix (e.g. "kanishk" from "kanishk@email.com")
  const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20) || "user";
  let username = baseUsername;
  // If taken, append random digits until unique
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await usersCol.findOne({ username }, { projection: { _id: 1 } });
    if (!taken) break;
    username = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
  }

  const doc = {
    email: email.toLowerCase(),
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
    return NextResponse.json({ id: String(res.insertedId) });
  } catch (e: unknown) {
    // MongoDB duplicate key error code is 11000
    if (e instanceof Error && "code" in e && (e as { code: number }).code === 11000) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }
    throw e;
  }
}
