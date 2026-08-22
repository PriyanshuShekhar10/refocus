import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/adminAudit";
import {
  createAdminTestCall,
  isValidAdminTestDuration,
  listActiveAdminTestCalls,
} from "@/lib/adminTestCall";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const sessions = await listActiveAdminTestCalls();
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => ({}))) as {
    durationMin?: unknown;
  };
  const durationMin = body.durationMin;
  if (durationMin !== undefined && !isValidAdminTestDuration(durationMin)) {
    return NextResponse.json(
      { error: "Invalid durationMin (allowed: 25, 50, 75)" },
      { status: 400 },
    );
  }

  try {
    const result = await createAdminTestCall({
      adminUserId: guard.admin.userId,
      adminName: guard.admin.email.split("@")[0],
      durationMin: isValidAdminTestDuration(durationMin)
        ? durationMin
        : undefined,
    });

    await logAdminAction({
      actorId: guard.admin.userId,
      actorEmail: guard.admin.email,
      action: "test_call.create",
      resourceId: result.sessionId,
      details: {
        durationMin: result.durationMin,
        endTime: result.endTime,
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[admin/test-call] Failed to create test call", err);
    const message =
      err instanceof Error ? err.message : "Failed to create test call";
    const status = message.includes("DAILY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
