import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { isUserAdmin, requireAdmin } from "@/lib/admin";
import { getUserAuditLabel, logAdminAction } from "@/lib/adminAudit";

type ModerationAction = "ban" | "unban" | "mute" | "unmute";

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

  if (userId === guard.admin.userId) {
    return NextResponse.json(
      { error: "You cannot moderate your own account." },
      { status: 400 },
    );
  }

  if (await isUserAdmin(userId)) {
    return NextResponse.json(
      { error: "Cannot moderate another admin." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { action, muteDays } = body as {
    action?: ModerationAction;
    muteDays?: number;
  };

  if (!action || !["ban", "unban", "mute", "unmute"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const target = await getUserAuditLabel(userId);
  const db = await getDb();
  const now = new Date();

  if (action === "ban") {
    const { banEmail } = await import("@/lib/bannedEmails");
    const {
      addBannedIpWatches,
      getBannedUserIps,
    } = await import("@/lib/bannedIpWatch");
    const ips = await getBannedUserIps(userId);
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          communityBannedAt: now,
          communityMutedUntil: null,
          communityModeratedBy: guard.admin.userId,
          communityModeratedAt: now,
        },
      },
    );
    await banEmail({
      email: target.email,
      userId,
      bannedBy: guard.admin.userId,
    });
    await addBannedIpWatches({
      userId,
      email: target.email,
      signupIp: ips.signupIp,
      lastLoginIp: ips.lastLoginIp,
    });
    await logAdminAction({
      actorId: guard.admin.userId,
      actorEmail: guard.admin.email,
      action: "user.ban",
      targetUserId: userId,
      targetUserEmail: target.email,
      targetLabel: target.label,
    });
    return NextResponse.json({ ok: true, action: "ban" });
  }

  if (action === "unban") {
    const { unbanEmail } = await import("@/lib/bannedEmails");
    const { removeBannedIpWatchesForUser } = await import("@/lib/bannedIpWatch");
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $unset: { communityBannedAt: "" },
        $set: {
          communityModeratedBy: guard.admin.userId,
          communityModeratedAt: now,
        },
      },
    );
    await unbanEmail(target.email);
    await removeBannedIpWatchesForUser(userId);
    await logAdminAction({
      actorId: guard.admin.userId,
      actorEmail: guard.admin.email,
      action: "user.unban",
      targetUserId: userId,
      targetUserEmail: target.email,
      targetLabel: target.label,
    });
    return NextResponse.json({ ok: true, action: "unban" });
  }

  if (action === "mute") {
    const days = typeof muteDays === "number" && muteDays > 0 ? muteDays : 7;
    const mutedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          communityMutedUntil: mutedUntil,
          communityModeratedBy: guard.admin.userId,
          communityModeratedAt: now,
        },
      },
    );
    await logAdminAction({
      actorId: guard.admin.userId,
      actorEmail: guard.admin.email,
      action: "user.mute",
      targetUserId: userId,
      targetUserEmail: target.email,
      targetLabel: target.label,
      details: { muteDays: days, mutedUntil: mutedUntil.toISOString() },
    });
    return NextResponse.json({ ok: true, action: "mute", mutedUntil });
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $unset: { communityMutedUntil: "" },
      $set: {
        communityModeratedBy: guard.admin.userId,
        communityModeratedAt: now,
      },
    },
  );
  await logAdminAction({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    action: "user.unmute",
    targetUserId: userId,
    targetUserEmail: target.email,
    targetLabel: target.label,
  });
  return NextResponse.json({ ok: true, action: "unmute" });
}
