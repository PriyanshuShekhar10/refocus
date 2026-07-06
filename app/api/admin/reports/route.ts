import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { REPORT_REASON_LABELS, REPORT_TARGET_LABELS } from "@/lib/reportConstants";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);

  const filter: Record<string, unknown> = {};
  if (status !== "all") {
    filter.status = status;
  }

  const db = await getDb();
  const [reports, total] = await Promise.all([
    db
      .collection("content_reports")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("content_reports").countDocuments(filter),
  ]);

  const pendingByTarget = await db
    .collection("content_reports")
    .aggregate([
      { $match: { status: "pending" } },
      {
        $group: {
          _id: { targetType: "$targetType", targetId: "$targetId" },
          totalReports: { $sum: "$reportCount" },
          reporterEmails: { $addToSet: "$reporterEmail" },
        },
      },
    ])
    .toArray();

  const clusterMap = new Map<string, { totalReports: number; reporterEmails: string[] }>();
  for (const row of pendingByTarget) {
    const key = `${row._id.targetType}:${row._id.targetId}`;
    clusterMap.set(key, {
      totalReports: row.totalReports as number,
      reporterEmails: (row.reporterEmails as string[]).filter(Boolean),
    });
  }

  return NextResponse.json({
    reports: reports.map((r) => {
      const clusterKey = `${r.targetType}:${r.targetId}`;
      const cluster = clusterMap.get(clusterKey);
      return {
        id: String(r._id),
        reporterId: r.reporterId ?? null,
        reporterEmail: r.reporterEmail ?? null,
        reportedUserId: r.reportedUserId ?? null,
        reportedUserEmail: r.reportedUserEmail ?? null,
        reportedUserLabel: r.reportedUserLabel ?? null,
        targetType: r.targetType,
        targetTypeLabel:
          REPORT_TARGET_LABELS[r.targetType as keyof typeof REPORT_TARGET_LABELS] ??
          r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        reasonLabel:
          REPORT_REASON_LABELS[r.reason as keyof typeof REPORT_REASON_LABELS] ??
          r.reason,
        details: r.details ?? null,
        contentSnapshot: r.contentSnapshot ?? null,
        status: r.status,
        reportCount: r.reportCount ?? 1,
        clusterReportCount: cluster?.totalReports ?? r.reportCount ?? 1,
        clusterReporterEmails: cluster?.reporterEmails ?? [r.reporterEmail].filter(Boolean),
        resolution: r.resolution ?? null,
        resolutionNote: r.resolutionNote ?? null,
        resolvedBy: r.resolvedBy ?? null,
        resolvedAt: r.resolvedAt
          ? new Date(r.resolvedAt as Date).toISOString()
          : null,
        createdAt: r.createdAt
          ? new Date(r.createdAt as Date).toISOString()
          : null,
      };
    }),
    total,
    skip,
    limit,
  });
}
