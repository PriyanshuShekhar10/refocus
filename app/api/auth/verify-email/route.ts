import { NextRequest, NextResponse } from "next/server";
import {
  isEmailVerificationTokenValid,
  verifyEmailWithToken,
} from "@/lib/emailVerification";

/**
 * Read-only token check. Must stay side-effect-free: corporate email
 * security gateways (e.g. Microsoft Defender Safe Links) automatically
 * GET every link in an incoming email to scan it, before the user ever
 * clicks it. Older verification emails also linked straight to this
 * route, so this still exists for backward compatibility — it just no
 * longer mutates anything.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const valid = await isEmailVerificationTokenValid(token);
  return NextResponse.json({ valid });
}

/** Actually consumes the token. Only triggered by an explicit user click. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : null;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const result = await verifyEmailWithToken(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
