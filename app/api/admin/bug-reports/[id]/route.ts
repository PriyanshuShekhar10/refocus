import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/mongodb";
import { logAdminAction } from "@/lib/adminAudit";

/** PATCH /api/admin/bug-reports/:id  { status: "open" | "resolved" } */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { status?: unknown };
  if (body.status !== "open" && body.status !== "resolved") {
    return NextResponse.json({ error: "status must be open or resolved" }, { status: 400 });
  }

  const db = await getDb();
  const set =
    body.status === "resolved"
      ? { status: "resolved", resolvedAt: new Date(), resolvedBy: guard.admin.email }
      : { status: "open", resolvedAt: null, resolvedBy: null };
  const updated = await db
    .collection("bug_reports")
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: set }, { returnDocument: "after" });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAdminAction({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    action: body.status === "resolved" ? "bug.resolve" : "bug.reopen",
    targetUserId: updated.userId ?? null,
    targetUserEmail: updated.userEmail ?? null,
    targetLabel: updated.userName ?? null,
    resourceId: id,
    details: { lines: [String(updated.description).split("\n")[0].slice(0, 120)] },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
