import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/adminAudit";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import {
  createProductUpdate,
  listAllProductUpdates,
} from "@/lib/productUpdates";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const db = await getDb();
  const updates = await listAllProductUpdates(db);
  return NextResponse.json({ updates });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const rl = await checkRateLimit(guard.admin.userId, "admin_updates");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = (await req.json().catch(() => ({}))) as {
    title?: unknown;
    body?: unknown;
  };

  const message =
    typeof body.body === "string" ? body.body : "";
  const title =
    typeof body.title === "string" ? body.title : undefined;

  const db = await getDb();

  const adminUser = (await db.collection("users").findOne(
    { _id: new ObjectId(guard.admin.userId) },
    { projection: { firstname: 1, name: 1 } },
  )) as { firstname?: string | null; name?: string | null } | null;

  try {
    const update = await createProductUpdate(db, {
      body: message,
      title,
      createdBy: guard.admin.userId,
      createdByName: adminUser?.firstname ?? adminUser?.name ?? null,
    });

    await logAdminAction({
      actorId: guard.admin.userId,
      actorEmail: guard.admin.email,
      action: "update.publish",
      resourceId: update.id,
      details: {
        title: update.title,
        bodyPreview: update.body.slice(0, 120),
      },
    });

    return NextResponse.json({ update });
  } catch (err) {
    const messageText = (err as Error).message || "Failed to publish update";
    return NextResponse.json({ error: messageText }, { status: 400 });
  }
}
