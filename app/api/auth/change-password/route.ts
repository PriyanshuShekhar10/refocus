import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { validatePassword } from "@/lib/validatePassword";

/**
 * POST /api/auth/change-password
 * Body: { currentPassword: string, newPassword: string }
 *
 * Requires an authenticated session. Verifies the current password, ensures
 * the new password meets strength requirements, and rotates the hash. Returns
 * { ok: true } on success.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit password changes per-user to slow brute-force on currentPassword.
  const rl = await checkRateLimit(userId, "auth");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Both current and new passwords are required" },
      { status: 400 }
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current one" },
      { status: 400 }
    );
  }

  const { strength, requirements } = validatePassword(newPassword);
  if (strength === "weak") {
    return NextResponse.json(
      { error: "New password is too weak", requirements },
      { status: 400 }
    );
  }

  const db = await getDb();
  const user = await db
    .collection<{ _id: ObjectId; hashedPassword?: string }>("users")
    .findOne({ _id: new ObjectId(userId) });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!user.hashedPassword) {
    return NextResponse.json(
      { error: "This account does not use a password" },
      { status: 400 }
    );
  }

  const ok = await bcrypt.compare(currentPassword, user.hashedPassword);
  if (!ok) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  const nextHash = await bcrypt.hash(newPassword, 10);
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        hashedPassword: nextHash,
        passwordUpdatedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({ ok: true });
}
