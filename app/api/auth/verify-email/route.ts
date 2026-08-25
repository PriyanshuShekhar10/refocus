import { NextRequest, NextResponse } from "next/server";
import { verifyEmailWithToken } from "@/lib/emailVerification";
import { getAppUrl } from "@/lib/site";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const appUrl = getAppUrl();

  if (!token) {
    return NextResponse.redirect(
      `${appUrl}/auth/verify-email?status=missing`,
    );
  }

  const result = await verifyEmailWithToken(token);

  if (!result.ok) {
    return NextResponse.redirect(
      `${appUrl}/auth/verify-email?status=invalid`,
    );
  }

  return NextResponse.redirect(
    `${appUrl}/auth/verify-email?status=success`,
  );
}
