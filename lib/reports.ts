import { Db, ObjectId } from "mongodb";
import { areFriends } from "@/lib/friendship";
import { isUserAdmin } from "@/lib/admin";
import { getUserAuditLabel } from "@/lib/adminAudit";
import { isOwnerOrParticipant } from "@/lib/sessionAccess";
import {
  CONTENT_SNAPSHOT_MAX_LENGTH,
  SESSION_REPORT_MAX_AGE_DAYS,
  type ReportTargetType,
} from "@/lib/reportConstants";

export {
  type ReportTargetType,
  type ReportReason,
  type ReportStatus,
  type ReportResolution,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_TARGET_LABELS,
  REPORT_DETAILS_MAX_LENGTH,
  isValidReportReason,
  isValidReportTargetType,
} from "@/lib/reportConstants";

export function truncateSnapshot(content: string | null | undefined): string {
  if (!content) return "";
  const trimmed = content.trim();
  if (trimmed.length <= CONTENT_SNAPSHOT_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, CONTENT_SNAPSHOT_MAX_LENGTH)}…`;
}

export type ResolvedReportTarget = {
  reportedUserId: string;
  reportedUserEmail: string | null;
  reportedUserLabel: string | null;
  contentSnapshot: string;
};

export class ReportValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function resolveReportTarget(
  db: Db,
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reportedUserIdHint?: string,
): Promise<ResolvedReportTarget> {
  if (!ObjectId.isValid(targetId)) {
    throw new ReportValidationError("Invalid target id");
  }

  if (targetType === "friend_message") {
    const message = await db.collection("messages").findOne({
      _id: new ObjectId(targetId),
      type: "text",
      deleted: { $ne: true },
    });
    if (!message) {
      throw new ReportValidationError("Message not found", 404);
    }
    const fromId = String(message.from_user_id);
    const toId = String(message.to_user_id);
    const isParticipant = reporterId === fromId || reporterId === toId;
    if (!isParticipant) {
      throw new ReportValidationError("Forbidden", 403);
    }
    const friendId = reporterId === fromId ? toId : fromId;
    if (!(await areFriends(reporterId, friendId))) {
      throw new ReportValidationError("Forbidden", 403);
    }
    if (fromId === reporterId) {
      throw new ReportValidationError("You cannot report your own content");
    }
    const reportedUserId = fromId;
    if (await isUserAdmin(reportedUserId)) {
      throw new ReportValidationError("Cannot report an admin");
    }
    const label = await getUserAuditLabel(reportedUserId);
    return {
      reportedUserId,
      reportedUserEmail: label.email,
      reportedUserLabel: label.label,
      contentSnapshot: truncateSnapshot(message.content as string),
    };
  }

  if (targetType === "global_message") {
    const message = await db.collection("global_messages").findOne({
      _id: new ObjectId(targetId),
      deleted: { $ne: true },
    });
    if (!message) {
      throw new ReportValidationError("Message not found", 404);
    }
    const reportedUserId = String(message.user_id);
    if (reportedUserId === reporterId) {
      throw new ReportValidationError("You cannot report your own content");
    }
    if (await isUserAdmin(reportedUserId)) {
      throw new ReportValidationError("Cannot report an admin");
    }
    const label = await getUserAuditLabel(reportedUserId);
    return {
      reportedUserId,
      reportedUserEmail: label.email,
      reportedUserLabel: label.label ?? message.user_name ?? null,
      contentSnapshot: truncateSnapshot(message.content as string),
    };
  }

  if (targetType === "community_post") {
    const post = await db.collection("community_posts").findOne({
      _id: new ObjectId(targetId),
      deletedAt: { $exists: false },
    });
    if (!post) {
      throw new ReportValidationError("Post not found", 404);
    }
    const reportedUserId = post.authorId.toString();
    if (reportedUserId === reporterId) {
      throw new ReportValidationError("You cannot report your own content");
    }
    if (await isUserAdmin(reportedUserId)) {
      throw new ReportValidationError("Cannot report an admin");
    }
    const label = await getUserAuditLabel(reportedUserId);
    return {
      reportedUserId,
      reportedUserEmail: label.email,
      reportedUserLabel: label.label,
      contentSnapshot: truncateSnapshot(post.content as string),
    };
  }

  if (targetType === "community_comment") {
    const comment = await db.collection("community_comments").findOne({
      _id: new ObjectId(targetId),
      deletedAt: { $exists: false },
    });
    if (!comment) {
      throw new ReportValidationError("Comment not found", 404);
    }
    const reportedUserId = comment.authorId.toString();
    if (reportedUserId === reporterId) {
      throw new ReportValidationError("You cannot report your own content");
    }
    if (await isUserAdmin(reportedUserId)) {
      throw new ReportValidationError("Cannot report an admin");
    }
    const label = await getUserAuditLabel(reportedUserId);
    return {
      reportedUserId,
      reportedUserEmail: label.email,
      reportedUserLabel: label.label,
      contentSnapshot: truncateSnapshot(comment.content as string),
    };
  }

  const session = (await db.collection("sessions").findOne({
    _id: new ObjectId(targetId),
  })) as {
    owner_id: string;
    start_time: Date;
    end_time: Date;
    duration_min?: number;
    session_participants?: Array<{ user_id: string }>;
  } | null;
  if (!session) {
    throw new ReportValidationError("Session not found", 404);
  }
  if (!isOwnerOrParticipant(session, reporterId)) {
    throw new ReportValidationError("Forbidden", 403);
  }

  const endTime = new Date(session.end_time as Date);
  const maxAge = new Date(
    endTime.getTime() + SESSION_REPORT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  );
  if (new Date() > maxAge) {
    throw new ReportValidationError(
      "Reports for this session are no longer accepted",
    );
  }

  const participants = (session.session_participants ?? []) as Array<{
    user_id: string;
  }>;
  const otherParticipants = participants
    .map((p) => String(p.user_id))
    .filter((id) => id !== reporterId);

  let reportedUserId = reportedUserIdHint;
  if (reportedUserId) {
    if (!otherParticipants.includes(reportedUserId)) {
      throw new ReportValidationError("Invalid reported user for this session");
    }
  } else if (otherParticipants.length === 1) {
    reportedUserId = otherParticipants[0];
  } else {
    throw new ReportValidationError("reportedUserId is required for this session");
  }

  if (reportedUserId === reporterId) {
    throw new ReportValidationError("You cannot report yourself");
  }
  if (await isUserAdmin(reportedUserId)) {
    throw new ReportValidationError("Cannot report an admin");
  }

  const label = await getUserAuditLabel(reportedUserId);
  const sessionLabel = `Session ${new Date(session.start_time as Date).toLocaleString()} (${session.duration_min ?? "?"} min)`;
  return {
    reportedUserId,
    reportedUserEmail: label.email,
    reportedUserLabel: label.label,
    contentSnapshot: sessionLabel,
  };
}
