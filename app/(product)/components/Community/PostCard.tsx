"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Heart,
  MessageCircle,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
  Pin,
  Flag,
} from "lucide-react";
import CommunityModerationMenu from "./CommunityModerationMenu";
import ReportDialog from "@/app/(product)/components/ReportDialog";
import type { ReportTargetType } from "@/lib/reportConstants";

export type Post = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  authorInitials: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isPinned?: boolean;
};

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  authorInitials: string;
};

type AuthorLike = {
  authorName: string;
  authorInitials: string;
  authorAvatarUrl?: string | null;
};

function AuthorAvatar({
  author,
  className,
  fallbackClassName,
}: {
  author: AuthorLike;
  className: string;
  fallbackClassName: string;
}) {
  return (
    <Avatar className={className}>
      {author.authorAvatarUrl ? (
        <AvatarImage src={author.authorAvatarUrl} alt={author.authorName} />
      ) : null}
      <AvatarFallback className={fallbackClassName}>
        {author.authorInitials}
      </AvatarFallback>
    </Avatar>
  );
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  isAdmin?: boolean;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  onComment: (postId: string, content: string) => Promise<Comment | null>;
  onAdminDeletePost?: (postId: string) => Promise<void>;
  onAdminDeleteComment?: (commentId: string) => Promise<void>;
  onModerateUser?: (
    userId: string,
    action: "ban" | "unban" | "mute" | "unmute",
    muteDays?: number,
  ) => Promise<void>;
  onPreviewProfile?: (profile: {
    username: string;
    name: string;
    about?: string | null;
    avatarUrl?: string | null;
  }) => void;
}

export default function PostCard({
  post,
  currentUserId,
  isAdmin = false,
  onLike,
  onDelete,
  onComment,
  onAdminDeletePost,
  onAdminDeleteComment,
  onModerateUser,
  onPreviewProfile,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount);
  const [localIsLiked, setLocalIsLiked] = useState(post.isLiked);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    targetType: ReportTargetType;
    targetId: string;
    reportedUserId: string;
    reportedLabel: string;
    contentPreview?: string;
  } | null>(null);

  const isOwn = post.authorId === currentUserId;
  const isPinned = post.isPinned === true;
  const showReportPost = !isPinned && !isOwn && post.authorId !== "admin";
  const showAdminMenu =
    isAdmin &&
    !isPinned &&
    !isOwn &&
    post.authorId !== "admin" &&
    onModerateUser;
  const pinnedPreview = post.content.split("\n\n").slice(0, 2).join("\n\n");
  const pinnedHasMore = pinnedPreview.length < post.content.length;
  const displayContent =
    isPinned && !isPinnedExpanded && pinnedHasMore
      ? `${pinnedPreview}\n\n...`
      : post.content;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const handleLike = () => {
    if (isPinned) return;
    // Optimistic update
    setLocalIsLiked(!localIsLiked);
    setLocalLikesCount(localIsLiked ? localLikesCount - 1 : localLikesCount + 1);
    onLike(post.id);
  };

  const handleComment = async () => {
    if (isPinned) return;
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const newComment = await onComment(post.id, commentText.trim());
      if (newComment) {
        setComments((prev) => [...prev, newComment]);
        setLocalCommentsCount((prev) => prev + 1);
        setCommentText("");
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleComment();
    }
  };

  return (
    <>
    <div
      className={`border-b border-border py-4 last:border-b-0 ${
        isPinned ? "bg-[#FFF1D3]/80 dark:bg-[#5D1C6A]/30 rounded-md px-3" : ""
      }`}
    >
      {/* Post Header */}
      <div className="flex items-start gap-3">
        {post.authorUsername && onPreviewProfile ? (
          <button
            type="button"
            onClick={() =>
              onPreviewProfile({
                username: post.authorUsername!,
                name: post.authorName,
                avatarUrl: post.authorAvatarUrl ?? null,
              })
            }
          >
            <AuthorAvatar
              author={post}
              className="h-10 w-10 hover:ring-2 hover:ring-[#CA5995] transition-shadow cursor-pointer"
              fallbackClassName="text-sm bg-muted"
            />
          </button>
        ) : post.authorUsername ? (
          <Link href={`/u/${post.authorUsername}`}>
            <AuthorAvatar
              author={post}
              className="h-10 w-10 hover:ring-2 hover:ring-[#CA5995] transition-shadow cursor-pointer"
              fallbackClassName="text-sm bg-muted"
            />
          </Link>
        ) : (
          <AuthorAvatar
            author={post}
            className="h-10 w-10"
            fallbackClassName="text-sm bg-muted"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {post.authorUsername && onPreviewProfile ? (
                <button
                  type="button"
                  onClick={() =>
                    onPreviewProfile({
                      username: post.authorUsername!,
                      name: post.authorName,
                      avatarUrl: post.authorAvatarUrl ?? null,
                    })
                  }
                  className="font-medium text-sm hover:text-[#5D1C6A] dark:hover:text-[#CA5995] hover:underline transition-colors"
                >
                  {post.authorName}
                </button>
              ) : post.authorUsername ? (
                <Link href={`/u/${post.authorUsername}`} className="font-medium text-sm hover:text-[#5D1C6A] dark:hover:text-[#CA5995] hover:underline transition-colors">
                  {post.authorName}
                </Link>
              ) : (
                <span className="font-medium text-sm">{post.authorName}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTime(post.createdAt)}
              </span>
              {isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#FFB090] bg-[#FFF1D3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5D1C6A] dark:border-[#CA5995]/70 dark:bg-[#5D1C6A]/40 dark:text-[#FFB090]">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
              )}
            </div>
            {isOwn && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(post.id)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {showAdminMenu ? (
              <CommunityModerationMenu
                targetUserId={post.authorId}
                targetLabel={post.authorName}
                deleteLabel="Delete post"
                onDeleteContent={
                  onAdminDeletePost
                    ? () => onAdminDeletePost(post.id)
                    : undefined
                }
                onModerate={onModerateUser!}
              />
            ) : null}
            {showReportPost ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setReportTarget({
                    targetType: "community_post",
                    targetId: post.id,
                    reportedUserId: post.authorId,
                    reportedLabel: post.authorName,
                    contentPreview: post.content,
                  })
                }
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Report post"
              >
                <Flag className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          {/* Post Content */}
          <p className="mt-2 text-sm whitespace-pre-wrap break-words">
            {displayContent}
          </p>
          {isPinned && pinnedHasMore && (
            <button
              type="button"
              onClick={() => setIsPinnedExpanded((prev) => !prev)}
              className="mt-2 text-xs font-medium text-[#5D1C6A] hover:text-[#CA5995] dark:text-[#FFB090] dark:hover:text-[#CA5995]"
            >
              {isPinnedExpanded ? "Show less" : "Read full welcome and rules"}
            </button>
          )}

          {/* Actions */}
          {!isPinned && (
            <div className="flex items-center gap-4 mt-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                localIsLiked
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-red-500"
              }`}
            >
              <Heart
                className={`h-4 w-4 ${localIsLiked ? "fill-current" : ""}`}
              />
              <span>{localLikesCount}</span>
            </button>
            <button
              onClick={toggleComments}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{localCommentsCount}</span>
              {showComments ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            </div>
          )}

          {/* Comments Section */}
          {!isPinned && showComments && (
            <div className="mt-4 space-y-3">
              {loadingComments ? (
                <p className="text-xs text-muted-foreground">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => {
                    const commentIsOwn = comment.authorId === currentUserId;
                    const showCommentAdminMenu =
                      isAdmin &&
                      !commentIsOwn &&
                      onModerateUser &&
                      onAdminDeleteComment;

                    return (
                    <div key={comment.id} className="flex gap-2">
                      {comment.authorUsername && onPreviewProfile ? (
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewProfile({
                              username: comment.authorUsername!,
                              name: comment.authorName,
                              avatarUrl: comment.authorAvatarUrl ?? null,
                            })
                          }
                        >
                          <AuthorAvatar
                            author={comment}
                            className="h-7 w-7 hover:ring-2 hover:ring-[#CA5995] transition-shadow cursor-pointer"
                            fallbackClassName="text-xs bg-muted"
                          />
                        </button>
                      ) : comment.authorUsername ? (
                        <Link href={`/u/${comment.authorUsername}`}>
                          <AuthorAvatar
                            author={comment}
                            className="h-7 w-7 hover:ring-2 hover:ring-[#CA5995] transition-shadow cursor-pointer"
                            fallbackClassName="text-xs bg-muted"
                          />
                        </Link>
                      ) : (
                        <AuthorAvatar
                          author={comment}
                          className="h-7 w-7"
                          fallbackClassName="text-xs bg-muted"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                          {comment.authorUsername && onPreviewProfile ? (
                            <button
                              type="button"
                              onClick={() =>
                                onPreviewProfile({
                                  username: comment.authorUsername!,
                                  name: comment.authorName,
                                  avatarUrl: comment.authorAvatarUrl ?? null,
                                })
                              }
                              className="text-xs font-medium hover:text-[#5D1C6A] dark:hover:text-[#CA5995] hover:underline transition-colors"
                            >
                              {comment.authorName}
                            </button>
                          ) : comment.authorUsername ? (
                            <Link href={`/u/${comment.authorUsername}`} className="text-xs font-medium hover:text-[#5D1C6A] dark:hover:text-[#CA5995] hover:underline transition-colors">
                              {comment.authorName}
                            </Link>
                          ) : (
                            <span className="text-xs font-medium">
                              {comment.authorName}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(comment.createdAt)}
                          </span>
                          </div>
                          {showCommentAdminMenu ? (
                            <CommunityModerationMenu
                              targetUserId={comment.authorId}
                              targetLabel={comment.authorName}
                              deleteLabel="Delete comment"
                              onDeleteContent={async () => {
                                await onAdminDeleteComment!(comment.id);
                                setComments((prev) =>
                                  prev.filter((c) => c.id !== comment.id),
                                );
                                setLocalCommentsCount((prev) =>
                                  Math.max(0, prev - 1),
                                );
                              }}
                              onModerate={onModerateUser!}
                            />
                          ) : null}
                          {commentIsOwn ? null : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setReportTarget({
                                  targetType: "community_comment",
                                  targetId: comment.id,
                                  reportedUserId: comment.authorId,
                                  reportedLabel: comment.authorName,
                                  contentPreview: comment.content,
                                })
                              }
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              aria-label="Report comment"
                            >
                              <Flag className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Comment Input */}
              <div className="flex gap-2 mt-3">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a comment..."
                  className="h-8 text-sm"
                  disabled={submittingComment}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleComment}
                  disabled={!commentText.trim() || submittingComment}
                  className="h-8 px-2"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    {reportTarget ? (
      <ReportDialog
        open
        onClose={() => setReportTarget(null)}
        targetType={reportTarget.targetType}
        targetId={reportTarget.targetId}
        reportedUserId={reportTarget.reportedUserId}
        reportedLabel={reportTarget.reportedLabel}
        contentPreview={reportTarget.contentPreview}
      />
    ) : null}
    </>
  );
}
