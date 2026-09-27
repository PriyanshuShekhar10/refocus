import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/ratelimit";
import { sendPasswordResetEmail } from "@/lib/email/sendPasswordResetEmail";
import { findUserByEmailIdentity } from "@/lib/bannedEmails";

/** Always return success so we do not reveal whether an email is registered. */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimitResult = await checkRateLimit(ip, "auth");
  if (!rateLimitResult.success) {
    return rateLimitedResponse(rateLimitResult);
  }

  const body = await req.json().catch(() => ({}));
  const email = (body as { email?: string }).email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = (await findUserByEmailIdentity(email)) as {
    _id: unknown;
    email?: string | null;
    firstname?: string | null;
  } | null;

  // Google-only accounts have no password yet. Still send the link so they
  // can set one and sign in with email afterwards.
  if (user?.email) {
    await sendPasswordResetEmail({
      userId: String(user._id),
      email: user.email,
      firstName: user.firstname ?? null,
    }).catch((err) => {
      console.error("[forgot-password] Email failed:", err);
    });
  }

  return NextResponse.json({ ok: true });
}
