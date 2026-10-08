import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/mongodb";

/** GET /api/admin/bug-reports?status=open|resolved|all */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const status = new URL(req.url).searchParams.get("status") ?? "open";
  const filter = status === "open" || status === "resolved" ? { status } : {};
  const db = await getDb();
  const col = db.collection("bug_reports");
  const [rows, open, resolved] = await Promise.all([
    col.find(filter).sort({ createdAt: -1 }).limit(200).toArray(),
    col.countDocuments({ status: "open" }),
    col.countDocuments({ status: "resolved" }),
  ]);
  return NextResponse.json({
    counts: { open, resolved },
    reports: rows.map((r) => ({
      id: String(r._id),
      userId: r.userId,
      userName: r.userName ?? null,
      userEmail: r.userEmail ?? null,
      description: r.description,
      pageUrl: r.pageUrl ?? null,
      userAgent: r.userAgent ?? null,
      viewport: r.viewport ?? null,
      timezone: r.timezone ?? null,
      status: r.status,
      emailed: Boolean(r.emailedAt),
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt ?? null,
      resolvedBy: r.resolvedBy ?? null,
    })),
  });
}
