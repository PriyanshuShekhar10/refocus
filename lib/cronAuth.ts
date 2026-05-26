import { NextRequest, NextResponse } from "next/server";

export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export function unauthorizedCronResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
