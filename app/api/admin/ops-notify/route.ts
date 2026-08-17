import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { OPS_NOTIFY_EMAIL } from "@/lib/email/opsNotify";
import {
  getOpsNotifyPrefs,
  setOpsNotifyPrefs,
} from "@/lib/email/opsNotifyPrefs";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const prefs = await getOpsNotifyPrefs();
  return NextResponse.json({
    email: OPS_NOTIFY_EMAIL,
    signup: prefs.signup,
    sessionMatched: prefs.sessionMatched,
  });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as {
    signup?: unknown;
    sessionMatched?: unknown;
  };

  const patch: { signup?: boolean; sessionMatched?: boolean } = {};
  if (typeof body.signup === "boolean") patch.signup = body.signup;
  if (typeof body.sessionMatched === "boolean") {
    patch.sessionMatched = body.sessionMatched;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const prefs = await setOpsNotifyPrefs(patch, gate.admin.userId);
  return NextResponse.json({
    ok: true,
    email: OPS_NOTIFY_EMAIL,
    signup: prefs.signup,
    sessionMatched: prefs.sessionMatched,
  });
}
