import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/ratelimit";
import { sendPasswordResetEmail } from "@/lib/email/sendPasswordResetEmail";

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

  const db = await getDb();
  const user = await db.collection("users").findOne(
    { email },
    { projection: { _id: 1, email: 1, firstname: 1, hashedPassword: 1 } },
  );

  if (user?.hashedPassword) {
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
