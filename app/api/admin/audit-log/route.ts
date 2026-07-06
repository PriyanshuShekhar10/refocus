import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);

  const db = await getDb();
  const [entries, total] = await Promise.all([
    db
      .collection("admin_audit_log")
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("admin_audit_log").countDocuments({}),
  ]);

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: String(e._id),
      actorId: e.actorId ?? null,
      actorEmail: e.actorEmail ?? null,
      action: e.action,
      targetUserId: e.targetUserId ?? null,
      targetUserEmail: e.targetUserEmail ?? null,
      targetLabel: e.targetLabel ?? null,
      resourceId: e.resourceId ?? null,
      details: e.details ?? null,
      createdAt: e.createdAt
        ? new Date(e.createdAt as Date).toISOString()
        : null,
    })),
    total,
    skip,
    limit,
  });
}
