export type ReportTargetType =
  | "friend_message"
  | "global_message"
  | "community_post"
  | "community_comment"
  | "session_call";

export type ReportReason =
  | "harassment"
  | "spam"
  | "inappropriate"
  | "threats"
  | "other";

export type ReportStatus = "pending" | "dismissed" | "action_taken";

export type ReportResolution =
  | "dismiss"
  | "delete_content"
  | "mute"
  | "ban";

export const REPORT_REASONS: ReportReason[] = [
  "harassment",
  "spam",
  "inappropriate",
  "threats",
  "other",
];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: "Harassment or bullying",
  spam: "Spam or scam",
  inappropriate: "Inappropriate content",
  threats: "Threats or violence",
  other: "Other",
};

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  friend_message: "Friend message",
  global_message: "Community chat",
  community_post: "Community post",
  community_comment: "Comment",
  session_call: "Video call",
};

export const REPORT_DETAILS_MAX_LENGTH = 500;
export const CONTENT_SNAPSHOT_MAX_LENGTH = 500;
export const SESSION_REPORT_MAX_AGE_DAYS = 7;

export function isValidReportReason(value: unknown): value is ReportReason {
  return (
    typeof value === "string" &&
    REPORT_REASONS.includes(value as ReportReason)
  );
}

export function isValidReportTargetType(
  value: unknown,
): value is ReportTargetType {
  const types: ReportTargetType[] = [
    "friend_message",
    "global_message",
    "community_post",
    "community_comment",
    "session_call",
  ];
  return typeof value === "string" && types.includes(value as ReportTargetType);
}
