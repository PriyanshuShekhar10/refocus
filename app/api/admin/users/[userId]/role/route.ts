import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  ADMIN_ROLE,
  countAdmins,
  requireAdmin,
} from "@/lib/admin";
import { logAdminAction } from "@/lib/adminAudit";

type RoleAction = "grant" | "revoke";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { userId } = await params;
  if (!ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: RoleAction };

  if (!action || !["grant", "revoke"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const db = await getDb();
  const target = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { email: 1, username: 1, name: 1, firstname: 1, lastname: 1, role: 1 } },
  )) as {
    email?: string;
    username?: string | null;
    name?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    role?: string | null;
  } | null;

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const targetLabel =
    [target.firstname, target.lastname].filter(Boolean).join(" ") ||
    target.name ||
    target.username ||
    target.email ||
    null;

  const targetIsAdmin = target.role === ADMIN_ROLE;

  if (action === "grant") {
    if (targetIsAdmin) {
      return NextResponse.json({ ok: true, alreadyAdmin: true });
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role: ADMIN_ROLE, updatedAt: new Date() } },
    );

    await logAdminAction({
      actorId: guard.admin.userId,
      actorEmail: guard.admin.email,
      action: "user.grant_admin",
      targetUserId: userId,
      targetUserEmail: target.email ?? null,
      targetLabel,
    });

    return NextResponse.json({ ok: true, action: "grant" });
  }

  if (!targetIsAdmin) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  const adminCount = await countAdmins();
  if (adminCount <= 1) {
    return NextResponse.json(
      { error: "Cannot revoke the last admin." },
      { status: 400 },
    );
  }

  if (userId === guard.admin.userId) {
    return NextResponse.json(
      { error: "You cannot revoke your own admin role." },
      { status: 400 },
    );
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $unset: { role: "" }, $set: { updatedAt: new Date() } },
  );

  await logAdminAction({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    action: "user.revoke_admin",
    targetUserId: userId,
    targetUserEmail: target.email ?? null,
    targetLabel,
  });

  return NextResponse.json({ ok: true, action: "revoke" });
}
