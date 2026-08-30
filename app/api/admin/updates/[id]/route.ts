import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/adminAudit";
import { deleteProductUpdate } from "@/lib/productUpdates";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Update not found" }, { status: 404 });
  }

  const db = await getDb();
  const existing = await db.collection("product_updates").findOne({
    _id: new ObjectId(id),
  });

  const ok = await deleteProductUpdate(db, id);
  if (!ok) {
    return NextResponse.json({ error: "Update not found" }, { status: 404 });
  }

  await logAdminAction({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    action: "update.delete",
    resourceId: id,
    details: {
      bodyPreview:
        typeof existing?.body === "string"
          ? existing.body.slice(0, 120)
          : null,
    },
  });

  return NextResponse.json({ ok: true });
}
