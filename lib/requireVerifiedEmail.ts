import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isEmailVerified } from "@/lib/emailVerification";
import {
  EMAIL_NOT_VERIFIED_CODE,
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
} from "@/lib/emailVerificationMessages";

export { EMAIL_NOT_VERIFIED_CODE, EMAIL_VERIFICATION_REQUIRED_MESSAGE };

export async function getUserEmailVerified(userId: string): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const db = await getDb();
  const user = await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { emailVerified: 1 } },
  );
  if (!user) return false;
  return isEmailVerified(user.emailVerified);
}

export function emailNotVerifiedResponse(): NextResponse {
  return NextResponse.json(
    {
      error: EMAIL_VERIFICATION_REQUIRED_MESSAGE,
      code: EMAIL_NOT_VERIFIED_CODE,
    },
    { status: 403 },
  );
}

/** Returns a 403 response when unverified, or null when interaction is allowed. */
export async function requireVerifiedEmail(
  userId: string,
): Promise<NextResponse | null> {
  if (!(await getUserEmailVerified(userId))) {
    return emailNotVerifiedResponse();
  }
  return null;
}
