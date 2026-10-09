import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const digest = (v: string) => createHash("sha256").update(v).digest();

/** Constant-time check of `Authorization: Bearer <CRON_SECRET>`. */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return timingSafeEqual(digest(auth), digest(`Bearer ${secret}`));
}

export function unauthorizedCronResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
