import { Db, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { logAdminAction } from "@/lib/adminAudit";
import { globalChatChannel, chatChannel, publish } from "@/lib/sse";
import { publishAbly } from "@/lib/ably-server";
import type { ReportResolution, ReportTargetType } from "@/lib/reports";

type AdminContext = { userId: string; email: string };

export async function deleteReportedContent(
  db: Db,
  admin: AdminContext,
  targetType: ReportTargetType,
  targetId: string,
  reportedUserId: string,
  reportedUserEmail: string | null,
  reportedUserLabel: string | null,
): Promise<void> {
  if (targetType === "friend_message") {
    const message = await db.collection("messages").findOne({
      _id: new ObjectId(targetId),
      deleted: { $ne: true },
    });
    if (!message) return;

    const deletedAt = new Date();
    await db.collection("messages").updateOne(
      { _id: new ObjectId(targetId) },
      {
        $set: {
          deleted: true,
          deleted_at: deletedAt,
          content: "[This message was removed by a moderator]",
          deletedByAdmin: admin.userId,
        },
        $unset: { edited_at: "" },
      },
    );

    const fromId = String(message.from_user_id);
    const toId = String(message.to_user_id);
    const channel = chatChannel(fromId, toId);
    const event = {
      type: "message:deleted",
      payload: {
        id: targetId,
        content: "[This message was removed by a moderator]",
        deleted_at: deletedAt.toISOString(),
      },
    };
    await Promise.all([publish(channel, event), publishAbly(channel, event)]);

    await logAdminAction({
      actorId: admin.userId,
      actorEmail: admin.email,
      action: "friend_message.delete",
      targetUserId: reportedUserId,
      targetUserEmail: reportedUserEmail,
      targetLabel: reportedUserLabel,
      resourceId: targetId,
    });
    return;
  }

  if (targetType === "global_message") {
    const result = await db.collection("global_messages").updateOne(
      { _id: new ObjectId(targetId), deleted: { $ne: true } },
      {
        $set: {
          deleted: true,
          deleted_at: new Date(),
          content: "[This message was removed by a moderator]",
          deletedByAdmin: admin.userId,
        },
      },
    );
    if (result.modifiedCount > 0) {
      const event = {
        type: "message:deleted",
        payload: { id: targetId },
      };
      await Promise.all([
        publish(globalChatChannel(), event),
        publishAbly(globalChatChannel(), event),
      ]);
      await logAdminAction({
        actorId: admin.userId,
        actorEmail: admin.email,
        action: "chat.delete",
        targetUserId: reportedUserId,
        targetUserEmail: reportedUserEmail,
        targetLabel: reportedUserLabel,
        resourceId: targetId,
      });
    }
    return;
  }

  if (targetType === "community_post") {
    const result = await db.collection("community_posts").updateOne(
      { _id: new ObjectId(targetId), deletedAt: { $exists: false } },
      {
        $set: {
          deletedAt: new Date(),
          deletedByAdmin: admin.userId,
        },
      },
    );
    if (result.modifiedCount > 0) {
      await logAdminAction({
        actorId: admin.userId,
        actorEmail: admin.email,
        action: "post.delete",
        targetUserId: reportedUserId,
        targetUserEmail: reportedUserEmail,
        targetLabel: reportedUserLabel,
        resourceId: targetId,
      });
    }
    return;
  }

  if (targetType === "community_comment") {
    const result = await db.collection("community_comments").updateOne(
      { _id: new ObjectId(targetId), deletedAt: { $exists: false } },
      {
        $set: {
          deletedAt: new Date(),
          deletedByAdmin: admin.userId,
        },
      },
    );
    if (result.modifiedCount > 0) {
      await logAdminAction({
        actorId: admin.userId,
        actorEmail: admin.email,
        action: "comment.delete",
        targetUserId: reportedUserId,
        targetUserEmail: reportedUserEmail,
        targetLabel: reportedUserLabel,
        resourceId: targetId,
      });
    }
  }
}

export async function applyUserModeration(
  db: Db,
  admin: AdminContext,
  reportedUserId: string,
  reportedUserEmail: string | null,
  reportedUserLabel: string | null,
  resolution: "mute" | "ban",
  muteDays?: number,
): Promise<void> {
  const now = new Date();
  if (resolution === "ban") {
    const { banEmail } = await import("@/lib/bannedEmails");
    const {
      addBannedIpWatches,
      getBannedUserIps,
    } = await import("@/lib/bannedIpWatch");
    const ips = await getBannedUserIps(reportedUserId);
    await db.collection("users").updateOne(
      { _id: new ObjectId(reportedUserId) },
      {
        $set: {
          communityBannedAt: now,
          communityMutedUntil: null,
          communityModeratedBy: admin.userId,
          communityModeratedAt: now,
        },
      },
    );
    await banEmail({
      email: reportedUserEmail,
      userId: reportedUserId,
      bannedBy: admin.userId,
    });
    await addBannedIpWatches({
      userId: reportedUserId,
      email: reportedUserEmail,
      signupIp: ips.signupIp,
      lastLoginIp: ips.lastLoginIp,
    });
    await logAdminAction({
      actorId: admin.userId,
      actorEmail: admin.email,
      action: "user.ban",
      targetUserId: reportedUserId,
      targetUserEmail: reportedUserEmail,
      targetLabel: reportedUserLabel,
      details: { via: "report" },
    });
    return;
  }

  const days = typeof muteDays === "number" && muteDays > 0 ? muteDays : 7;
  const mutedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  await db.collection("users").updateOne(
    { _id: new ObjectId(reportedUserId) },
    {
      $set: {
        communityMutedUntil: mutedUntil,
        communityModeratedBy: admin.userId,
        communityModeratedAt: now,
      },
    },
  );
  await logAdminAction({
    actorId: admin.userId,
    actorEmail: admin.email,
    action: "user.mute",
    targetUserId: reportedUserId,
    targetUserEmail: reportedUserEmail,
    targetLabel: reportedUserLabel,
    details: { muteDays: days, mutedUntil: mutedUntil.toISOString(), via: "report" },
  });
}

export async function resolveContentReport(
  reportId: string,
  admin: AdminContext,
  resolution: ReportResolution,
  options?: { muteDays?: number; note?: string },
): Promise<{ ok: true }> {
  const db = await getDb();
  if (!ObjectId.isValid(reportId)) {
    throw new Error("Invalid report id");
  }

  const report = await db.collection("content_reports").findOne({
    _id: new ObjectId(reportId),
    status: "pending",
  });
  if (!report) {
    throw new Error("Report not found or already resolved");
  }

  const targetType = report.targetType as ReportTargetType;
  const targetId = String(report.targetId);
  const reportedUserId = String(report.reportedUserId);
  const reportedUserEmail = (report.reportedUserEmail as string) ?? null;
  const reportedUserLabel = (report.reportedUserLabel as string) ?? null;
  const now = new Date();

  if (resolution === "dismiss") {
    await db.collection("content_reports").updateMany(
      {
        targetType: report.targetType,
        targetId: report.targetId,
        status: "pending",
      },
      {
        $set: {
          status: "dismissed",
          resolution: "dismiss",
          resolutionNote: options?.note ?? null,
          resolvedBy: admin.userId,
          resolvedAt: now,
          updatedAt: now,
        },
      },
    );
    await logAdminAction({
      actorId: admin.userId,
      actorEmail: admin.email,
      action: "report.dismiss",
      targetUserId: reportedUserId,
      targetUserEmail: reportedUserEmail,
      targetLabel: reportedUserLabel,
      resourceId: reportId,
      details: { targetType, targetId, note: options?.note ?? null },
    });
    return { ok: true };
  }

  if (resolution === "delete_content") {
    if (targetType === "session_call" || targetType === "user") {
      throw new Error("Cannot delete content for this report type");
    }
    await deleteReportedContent(
      db,
      admin,
      targetType,
      targetId,
      reportedUserId,
      reportedUserEmail,
      reportedUserLabel,
    );
  } else if (resolution === "mute" || resolution === "ban") {
    await applyUserModeration(
      db,
      admin,
      reportedUserId,
      reportedUserEmail,
      reportedUserLabel,
      resolution,
      options?.muteDays,
    );
  }

  await db.collection("content_reports").updateMany(
    {
      targetType: report.targetType,
      targetId: report.targetId,
      status: "pending",
    },
    {
      $set: {
        status: "action_taken",
        resolution,
        resolutionNote: options?.note ?? null,
        resolvedBy: admin.userId,
        resolvedAt: now,
        updatedAt: now,
      },
    },
  );

  await logAdminAction({
    actorId: admin.userId,
    actorEmail: admin.email,
    action: "report.resolve",
    targetUserId: reportedUserId,
    targetUserEmail: reportedUserEmail,
    targetLabel: reportedUserLabel,
    resourceId: reportId,
    details: {
      resolution,
      targetType,
      targetId,
      note: options?.note ?? null,
      muteDays: options?.muteDays ?? null,
    },
  });

  return { ok: true };
}
