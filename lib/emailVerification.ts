import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const TOKEN_BYTES = 32;
const EXPIRY_HOURS = 48;

export function hashVerificationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createVerificationToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

export async function setEmailVerificationToken(
  userId: string,
  token: string,
): Promise<void> {
  const db = await getDb();
  const expires = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        emailVerificationToken: hashVerificationToken(token),
        emailVerificationExpires: expires,
        updatedAt: new Date(),
      },
    },
  );
}

export async function verifyEmailWithToken(
  token: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const hashed = hashVerificationToken(token);
  const db = await getDb();
  const user = await db.collection("users").findOne({
    emailVerificationToken: hashed,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    return { ok: false, error: "Invalid or expired verification link" };
  }

  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerified: new Date(),
        updatedAt: new Date(),
      },
      $unset: {
        emailVerificationToken: "",
        emailVerificationExpires: "",
      },
    },
  );

  return { ok: true };
}

export function isEmailVerified(
  emailVerified: Date | string | null | undefined,
): boolean {
  return emailVerified != null;
}
