import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/ratelimit";
import {
  isPasswordResetTokenValid,
  resetPasswordWithToken,
} from "@/lib/passwordReset";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const valid = await isPasswordResetTokenValid(token);
  return NextResponse.json({ valid });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimitResult = await checkRateLimit(ip, "auth");
  if (!rateLimitResult.success) {
    return rateLimitedResponse(rateLimitResult);
  }

  const body = await req.json().catch(() => ({}));
  const { token, password } = body as { token?: string; password?: string };

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and password are required" },
      { status: 400 },
    );
  }

  const result = await resetPasswordWithToken(token, password);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        requirements: result.requirements,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
