import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/ratelimit";

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
  const db = await getDb();
  const existing = await db
    .collection("users")
    .findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const firstname = (firstName ?? name ?? "").trim() || null;
  const lastname = (lastName ?? "").trim() || null;
  const fullName =
    [firstname || undefined, lastname || undefined].filter(Boolean).join(" ") ||
    null;
  const doc = {
    email: email.toLowerCase(),
    name: fullName,
    firstname,
    lastname,
    hashedPassword,
    emailVerified: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const res = await db.collection("users").insertOne(doc);
  return NextResponse.json({ id: String(res.insertedId) });
}
