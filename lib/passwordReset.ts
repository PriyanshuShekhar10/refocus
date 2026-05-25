import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  createVerificationToken,
  hashVerificationToken,
} from "@/lib/emailVerification";
import { validatePassword } from "@/lib/validatePassword";

const EXPIRY_HOURS = 1;

export function createPasswordResetToken(): string {
  return createVerificationToken();
}

export async function setPasswordResetToken(
  userId: string,
  token: string,
): Promise<void> {
  const db = await getDb();
  const expires = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        passwordResetToken: hashVerificationToken(token),
        passwordResetExpires: expires,
        updatedAt: new Date(),
      },
    },
  );
}

export async function isPasswordResetTokenValid(
  token: string,
): Promise<boolean> {
  const hashed = hashVerificationToken(token);
  const db = await getDb();
  const user = await db.collection("users").findOne(
    {
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    },
    { projection: { _id: 1 } },
  );
  return !!user;
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<
  | { ok: true }
  | { ok: false; error: string; requirements?: ReturnType<typeof validatePassword>["requirements"] }
> {
  const { strength, requirements } = validatePassword(newPassword);
  if (strength === "weak") {
    return { ok: false, error: "Password is too weak", requirements };
  }

  const hashed = hashVerificationToken(token);
  const db = await getDb();
  const user = await db.collection("users").findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    return { ok: false, error: "Invalid or expired reset link" };
  }

  const nextHash = await bcrypt.hash(newPassword, 10);
  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        hashedPassword: nextHash,
        passwordUpdatedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: {
        passwordResetToken: "",
        passwordResetExpires: "",
      },
    },
  );

  return { ok: true };
}
