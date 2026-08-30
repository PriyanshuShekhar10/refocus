"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import MentionComposer from "@/components/community/MentionComposer";
import MentionText from "@/components/community/MentionText";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart,
  MoreHorizontal,
  Trash2,
  Send,
  Flag,
  Ban,
} from "lucide-react";
import CommunityModerationMenu from "./CommunityModerationMenu";
import ReportDialog from "@/app/(product)/components/ReportDialog";
import { AdminTag } from "@/components/admin-tag";
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
  authorIsAdmin?: boolean;
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
  authorIsAdmin?: boolean;
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

function AuthorName({
  name,
  isAdmin,
  className = "font-medium text-sm",
}: {
  name: string;
  isAdmin?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 max-w-full min-w-0 ${className}`}>
      <span className="truncate">{name}</span>
      {isAdmin ? <AdminTag size="xs" /> : null}
    </span>
  );
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
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount);
  const [localIsLiked, setLocalIsLiked] = useState(post.isLiked);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount);
  const [blocking, setBlocking] = useState(false);
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
  const showBlock = showReportPost;
  const showAdminMenu =
    isAdmin &&
    !isPinned &&
    !isOwn &&
    post.authorId !== "admin" &&
    onModerateUser;
  const showOverflow =
    !isPinned && (isOwn || showReportPost || showAdminMenu);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

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

  const openComments = () => {
    if (!showComments && comments.length === 0) {
      void loadComments();
    }
    setShowComments(true);
  };

  const toggleComments = () => {
    if (!showComments && comments.length === 0) {
      void loadComments();
    }
    setShowComments(!showComments);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinned) return;
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleComment();
    }
  };

  const handleMentionClick = async (label: string) => {
    if (!onPreviewProfile) return;
    try {
      const res = await fetch(
        `/api/community/users/search?q=${encodeURIComponent(label)}&exact=1&limit=1`,
      );
      const data = (await res.json().catch(() => ({}))) as {
        users?: Array<{
          username: string;
          name: string;
          avatarUrl?: string | null;
        }>;
      };
      const user = data.users?.[0];
      if (!user?.username) return;
      onPreviewProfile({
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
      });
    } catch {
      // ignore lookup failures
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (deletingCommentId) return;
    if (!confirm("Delete this comment?")) return;

    setDeletingCommentId(commentId);
    const previous = comments;
    const previousCount = localCommentsCount;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setLocalCommentsCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(
        `/api/community/posts/${post.id}/comments/${commentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete comment");
      }
    } catch (e) {
      setComments(previous);
      setLocalCommentsCount(previousCount);
      alert((e as Error).message);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleBlock = async () => {
    if (blocking || !showBlock) return;
    if (
      !confirm(
        `Block ${post.authorName}? You won’t see each other in matching.`,
      )
    ) {
      return;
    }
    setBlocking(true);
    try {
      const res = await fetch("/api/users/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked_user_id: post.authorId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to block user");
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBlocking(false);
    }
  };

  return (
    <>
      <div className="group px-1 py-3 transition-colors hover:bg-muted/30">
        <div className="flex items-start gap-3">
          {post.authorUsername && onPreviewProfile ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewProfile({
                  username: post.authorUsername!,
                  name: post.authorName,
                  avatarUrl: post.authorAvatarUrl ?? null,
                });
              }}
            >
              <AuthorAvatar
                author={post}
                className="h-9 w-9 hover:ring-2 hover:ring-[#CA5995] transition-shadow cursor-pointer"
                fallbackClassName="text-xs bg-muted"
              />
            </button>
          ) : post.authorUsername ? (
            <Link href={`/u/${post.authorUsername}`} onClick={(e) => e.stopPropagation()}>
              <AuthorAvatar
                author={post}
                className="h-9 w-9 hover:ring-2 hover:ring-[#CA5995] transition-shadow cursor-pointer"
                fallbackClassName="text-xs bg-muted"
              />
            </Link>
          ) : (
            <AuthorAvatar
              author={post}
              className="h-9 w-9"
              fallbackClassName="text-xs bg-muted"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                {post.authorUsername && onPreviewProfile ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewProfile({
                        username: post.authorUsername!,
                        name: post.authorName,
                        avatarUrl: post.authorAvatarUrl ?? null,
                      });
                    }}
                    className="min-w-0 text-sm font-medium hover:text-[#5D1C6A] hover:underline dark:hover:text-[#CA5995]"
                  >
                    <AuthorName name={post.authorName} isAdmin={post.authorIsAdmin} />
                  </button>
                ) : post.authorUsername ? (
                  <Link
                    href={`/u/${post.authorUsername}`}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-0 hover:text-[#5D1C6A] hover:underline dark:hover:text-[#CA5995]"
                  >
                    <AuthorName name={post.authorName} isAdmin={post.authorIsAdmin} />
                  </Link>
                ) : (
                  <AuthorName name={post.authorName} isAdmin={post.authorIsAdmin} />
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  · {formatTime(post.createdAt)}
                </span>
              </div>

              {showOverflow ? (
                <div onClick={(e) => e.stopPropagation()}>
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
                      onReport={
                        showReportPost
                          ? () =>
                              setReportTarget({
                                targetType: "community_post",
                                targetId: post.id,
                                reportedUserId: post.authorId,
                                reportedLabel: post.authorName,
                                contentPreview: post.content,
                              })
                          : undefined
                      }
                      onBlock={showBlock ? () => void handleBlock() : undefined}
                      onModerate={onModerateUser!}
                    />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground opacity-70 hover:text-foreground group-hover:opacity-100"
                          aria-label="Post actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {isOwn ? (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (!confirm("Delete this post?")) return;
                              onDelete(post.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        ) : null}
                        {showReportPost ? (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              setReportTarget({
                                targetType: "community_post",
                                targetId: post.id,
                                reportedUserId: post.authorId,
                                reportedLabel: post.authorName,
                                contentPreview: post.content,
                              })
                            }
                          >
                            <Flag className="h-4 w-4" />
                            Report
                          </DropdownMenuItem>
                        ) : null}
                        {showBlock ? (
                          <>
                            {showReportPost ? <DropdownMenuSeparator /> : null}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={blocking}
                              onClick={() => void handleBlock()}
                            >
                              <Ban className="h-4 w-4" />
                              Block
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ) : null}
            </div>

            {!isPinned ? (
              <div
                onClick={openComments}
                className="mt-1.5 w-full cursor-pointer text-left text-sm whitespace-pre-wrap break-words"
              >
                <MentionText
                  content={post.content}
                  onMentionClick={
                    onPreviewProfile ? (label) => void handleMentionClick(label) : undefined
                  }
                />
              </div>
            ) : (
              <p className="mt-1.5 text-sm whitespace-pre-wrap break-words">
                <MentionText content={post.content} />
              </p>
            )}

            {!isPinned ? (
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLike}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    localIsLiked
                      ? "text-red-500"
                      : "text-muted-foreground hover:text-red-500"
                  }`}
                >
                  <Heart
                    className={`h-3.5 w-3.5 ${localIsLiked ? "fill-current" : ""}`}
                  />
                  <span>{localLikesCount}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleComments();
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span>comment {localCommentsCount}</span>
                </button>
              </div>
            ) : null}

            {!isPinned && showComments ? (
              <div className="mt-3 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                {loadingComments ? (
                  <p className="text-xs text-muted-foreground">Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No comments yet</p>
                ) : (
                  <div className="space-y-2.5">
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
                                className="h-6 w-6 hover:ring-2 hover:ring-[#CA5995] transition-shadow cursor-pointer"
                                fallbackClassName="text-[10px] bg-muted"
                              />
                            </button>
                          ) : comment.authorUsername ? (
                            <Link href={`/u/${comment.authorUsername}`}>
                              <AuthorAvatar
                                author={comment}
                                className="h-6 w-6 hover:ring-2 hover:ring-[#CA5995] transition-shadow cursor-pointer"
                                fallbackClassName="text-[10px] bg-muted"
                              />
                            </Link>
                          ) : (
                            <AuthorAvatar
                              author={comment}
                              className="h-6 w-6"
                              fallbackClassName="text-[10px] bg-muted"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1.5">
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
                                    className="text-xs hover:text-[#5D1C6A] hover:underline dark:hover:text-[#CA5995]"
                                  >
                                    <AuthorName
                                      name={comment.authorName}
                                      isAdmin={comment.authorIsAdmin}
                                      className="text-xs font-medium"
                                    />
                                  </button>
                                ) : comment.authorUsername ? (
                                  <Link
                                    href={`/u/${comment.authorUsername}`}
                                    className="hover:text-[#5D1C6A] hover:underline dark:hover:text-[#CA5995]"
                                  >
                                    <AuthorName
                                      name={comment.authorName}
                                      isAdmin={comment.authorIsAdmin}
                                      className="text-xs font-medium"
                                    />
                                  </Link>
                                ) : (
                                  <AuthorName
                                    name={comment.authorName}
                                    isAdmin={comment.authorIsAdmin}
                                    className="text-xs font-medium"
                                  />
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  · {formatTime(comment.createdAt)}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center">
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
                                ) : commentIsOwn ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                        aria-label="Comment actions"
                                      >
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        disabled={deletingCommentId === comment.id}
                                        onClick={() => void handleDeleteComment(comment.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                        aria-label="Comment actions"
                                      >
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() =>
                                          setReportTarget({
                                            targetType: "community_comment",
                                            targetId: comment.id,
                                            reportedUserId: comment.authorId,
                                            reportedLabel: comment.authorName,
                                            contentPreview: comment.content,
                                          })
                                        }
                                      >
                                        <Flag className="h-4 w-4" />
                                        Report
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              <MentionText
                                content={comment.content}
                                onMentionClick={
                                  onPreviewProfile
                                    ? (label) => void handleMentionClick(label)
                                    : undefined
                                }
                              />
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-2 flex gap-2">
                  <MentionComposer
                    value={commentText}
                    onChange={setCommentText}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a comment… @name to tag"
                    className="h-8 text-sm"
                    disabled={submittingComment}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleComment()}
                    disabled={!commentText.trim() || submittingComment}
                    className="h-8 px-2"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
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
