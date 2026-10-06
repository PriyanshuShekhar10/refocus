import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/mongodb";
import { logAdminAction } from "@/lib/adminAudit";
import {
  loadRematchDay,
  runRematch,
  todayInIst,
  type OwnerChoice,
  type RematchRequest,
} from "@/lib/adminRematch";

/** GET /api/admin/rematch?date=YYYY-MM-DD (IST) — sessions grouped by slot. */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const date = new URL(req.url).searchParams.get("date") || todayInIst();
  const day = await loadRematchDay(await getDb(), date);
  if (!day) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  return NextResponse.json(day);
}

const isId = (v: unknown): v is string => typeof v === "string" && ObjectId.isValid(v);

/** POST /api/admin/rematch — move, remove, or club. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const ownerChoice =
    body.ownerChoice === "handover" || body.ownerChoice === "cancel"
      ? (body.ownerChoice as OwnerChoice)
      : undefined;

  let request: RematchRequest;
  if (body.action === "move" && isId(body.sessionId) && isId(body.userId) && isId(body.targetSessionId)) {
    request = { action: "move", sessionId: body.sessionId, userId: body.userId, targetSessionId: body.targetSessionId, ownerChoice };
  } else if (body.action === "remove" && isId(body.sessionId) && isId(body.userId)) {
    request = { action: "remove", sessionId: body.sessionId, userId: body.userId, ownerChoice };
  } else if (body.action === "club" && isId(body.keepSessionId) && isId(body.absorbSessionId) && body.keepSessionId !== body.absorbSessionId) {
    request = { action: "club", keepSessionId: body.keepSessionId, absorbSessionId: body.absorbSessionId };
  } else {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const emails: Record<string, boolean> = {};
  if (body.emails && typeof body.emails === "object") {
    for (const [k, v] of Object.entries(body.emails as Record<string, unknown>)) {
      if (typeof v === "boolean") emails[k] = v;
    }
  }
  const expected: Record<string, string> = {};
  if (body.expected && typeof body.expected === "object") {
    for (const [k, v] of Object.entries(body.expected as Record<string, unknown>)) {
      if (typeof v === "string") expected[k] = v;
    }
  }
  const note = typeof body.note === "string" ? body.note : "";

  const db = await getDb();
  const outcome = await runRematch(db, request, { emails, note, expected });
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error, checks: outcome.checks }, { status: outcome.status });
  }

  const target = outcome.targetUserId;
  const targetUser = await db.collection("users").findOne(
    { _id: new ObjectId(target) },
    { projection: { email: 1, firstname: 1, lastname: 1, name: 1 } },
  );
  await logAdminAction({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    action:
      request.action === "club"
        ? "session.club"
        : request.action === "move"
          ? "session.rematch"
          : "session.remove_participant",
    targetUserId: target,
    targetUserEmail: (targetUser?.email as string | undefined) ?? null,
    targetLabel:
      [targetUser?.firstname, targetUser?.lastname].filter(Boolean).join(" ") ||
      (targetUser?.name as string | undefined) ||
      null,
    resourceId: request.action === "club" ? request.keepSessionId : request.sessionId,
    details: { lines: outcome.lines, request, emails, noteAdded: Boolean(note.trim()) },
  });

  return NextResponse.json({ ok: true, lines: outcome.lines, mails: outcome.mails, at: new Date().toISOString() });
}
