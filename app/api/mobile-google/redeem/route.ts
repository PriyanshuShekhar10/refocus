import { NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";

const COLLECTION = "mobile_google_handoffs";
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
const REQUEST_URI =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "https://dashboard.refocus.co.in";

type HandoffDoc = {
  code: string;
  googleIdToken: string;
  displayName: string | null;
  expiresAt: Date;
};

type SignInWithIdpResponse = {
  idToken?: string;
  displayName?: string;
  error?: { message?: string };
};

export async function POST(req: Request) {
  let body: { code?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  if (!FIREBASE_API_KEY) {
    return NextResponse.json({ error: "Firebase is not configured" }, { status: 500 });
  }

  const db = await getDb();
  const handoff = await db.collection<HandoffDoc>(COLLECTION).findOneAndDelete({
    code,
    expiresAt: { $gt: new Date() },
  });

  if (!handoff) {
    return NextResponse.json(
      { error: "Sign-in code expired. Please try again." },
      { status: 410 },
    );
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `id_token=${encodeURIComponent(handoff.googleIdToken)}&providerId=google.com`,
        requestUri: REQUEST_URI.replace(/\/$/, ""),
        returnSecureToken: true,
        returnIdpCredential: true,
      }),
    },
  );
  const data = (await res.json()) as SignInWithIdpResponse;
  if (!res.ok || !data.idToken) {
    return NextResponse.json(
      { error: data.error?.message || "Google sign-in failed." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    firebaseIdToken: data.idToken,
    displayName: data.displayName?.trim() || handoff.displayName,
  });
}
