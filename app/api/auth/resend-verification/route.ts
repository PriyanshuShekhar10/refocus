import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { isEmailVerified } from "@/lib/emailVerification";
import { sendWelcomeVerificationEmail } from "@/lib/email/sendWelcomeEmail";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`verify-email:${userId}`, "auth");
  if (!rl.success) return rateLimitedResponse(rl);

  const db = await getDb();
  const user = await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { email: 1, firstname: 1, emailVerified: 1 } },
  );

  if (!user?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (isEmailVerified(user.emailVerified)) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const result = await sendWelcomeVerificationEmail({
    userId,
    email: user.email,
    firstName: user.firstname ?? null,
  });

  if (!result.sent) {
    return NextResponse.json(
      {
        error:
          result.reason === "not_configured"
            ? "Email service is not configured"
            : "Failed to send verification email",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
