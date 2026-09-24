import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";

const COLLECTION = "mobile_google_handoffs";
const TTL_MS = 5 * 60 * 1000;

type HandoffDoc = {
  code: string;
  googleIdToken: string;
  displayName: string | null;
  createdAt: Date;
  expiresAt: Date;
};

export async function POST(req: Request) {
  let body: { googleIdToken?: string; displayName?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const googleIdToken = body.googleIdToken?.trim();
  if (!googleIdToken) {
    return NextResponse.json({ error: "Missing Google token" }, { status: 400 });
  }

  const code = randomBytes(16).toString("hex");
  const now = new Date();
  const doc: HandoffDoc = {
    code,
    googleIdToken,
    displayName: body.displayName?.trim() || null,
    createdAt: now,
    expiresAt: new Date(now.getTime() + TTL_MS),
  };

  const db = await getDb();
  const col = db.collection<HandoffDoc>(COLLECTION);
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
  await col.insertOne(doc);

  return NextResponse.json({ code });
}
