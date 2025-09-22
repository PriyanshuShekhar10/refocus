import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, password, name } = body as {
    email?: string;
    password?: string;
    name?: string;
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
  const doc = {
    email: email.toLowerCase(),
    name: name || null,
    hashedPassword,
    emailVerified: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const res = await db.collection("users").insertOne(doc);
  return NextResponse.json({ id: String(res.insertedId) });
}
