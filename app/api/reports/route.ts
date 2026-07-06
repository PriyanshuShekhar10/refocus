import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { requireVerifiedEmail } from "@/lib/requireVerifiedEmail";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import {
  isValidReportReason,
  isValidReportTargetType,
  REPORT_DETAILS_MAX_LENGTH,
  ReportValidationError,
  resolveReportTarget,
} from "@/lib/reports";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const reporterId = (session?.user as { id?: string } | undefined)?.id;
  const reporterEmail = session?.user?.email;
  if (!reporterId || !reporterEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailGate = await requireVerifiedEmail(reporterId);
  if (emailGate) return emailGate;

  const rl = await checkRateLimit(reporterId, "report");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { targetType, targetId, reason, details, reportedUserId } = body as {
    targetType?: unknown;
    targetId?: string;
    reason?: unknown;
    details?: string;
    reportedUserId?: string;
  };

  if (!isValidReportTargetType(targetType) || !targetId?.trim()) {
    return NextResponse.json(
      { error: "Invalid targetType or targetId" },
      { status: 400 },
    );
  }
  if (!isValidReportReason(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const trimmedDetails =
    typeof details === "string" ? details.trim().slice(0, REPORT_DETAILS_MAX_LENGTH) : "";

  const db = await getDb();

  try {
    const resolved = await resolveReportTarget(
      db,
      reporterId,
      targetType,
      targetId.trim(),
      reportedUserId,
    );

    const now = new Date();
    const existing = await db.collection("content_reports").findOne({
      reporterId,
      targetType,
      targetId: targetId.trim(),
      status: "pending",
    });

    if (existing) {
      await db.collection("content_reports").updateOne(
        { _id: existing._id },
        {
          $inc: { reportCount: 1 },
          $set: {
            reason,
            details: trimmedDetails || null,
            updatedAt: now,
          },
        },
      );
      return NextResponse.json({
        ok: true,
        reportId: String(existing._id),
        duplicate: true,
      });
    }

    const insert = await db.collection("content_reports").insertOne({
      reporterId,
      reporterEmail,
      reportedUserId: resolved.reportedUserId,
      reportedUserEmail: resolved.reportedUserEmail,
      reportedUserLabel: resolved.reportedUserLabel,
      targetType,
      targetId: targetId.trim(),
      reason,
      details: trimmedDetails || null,
      contentSnapshot: resolved.contentSnapshot,
      status: "pending",
      reportCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      ok: true,
      reportId: String(insert.insertedId),
    });
  } catch (e) {
    if (e instanceof ReportValidationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
