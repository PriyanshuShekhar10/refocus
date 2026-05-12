"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";

export type Post = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorUsername?: string | null;
  authorInitials: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
};

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorUsername?: string | null;
  authorInitials: string;
};

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  onComment: (postId: string, content: string) => Promise<Comment | null>;
}

export default function PostCard({
  post,
  currentUserId,
  onLike,
  onDelete,
  onComment,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount);
  const [localIsLiked, setLocalIsLiked] = useState(post.isLiked);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount);

  const isOwn = post.authorId === currentUserId;

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
    // Optimistic update
    setLocalIsLiked(!localIsLiked);
    setLocalLikesCount(localIsLiked ? localLikesCount - 1 : localLikesCount + 1);
    onLike(post.id);
  };

  const handleComment = async () => {
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
    <div className="border-b border-border py-4 last:border-b-0">
      {/* Post Header */}
      <div className="flex items-start gap-3">
        {post.authorUsername ? (
          <Link href={`/u/${post.authorUsername}`}>
            <Avatar className="h-10 w-10 hover:ring-2 hover:ring-green-500 transition-shadow cursor-pointer">
              <AvatarFallback className="text-sm bg-muted">
                {post.authorInitials}
              </AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-sm bg-muted">
              {post.authorInitials}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {post.authorUsername ? (
                <Link href={`/u/${post.authorUsername}`} className="font-medium text-sm hover:text-green-600 dark:hover:text-green-400 hover:underline transition-colors">
                  {post.authorName}
                </Link>
              ) : (
                <span className="font-medium text-sm">{post.authorName}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTime(post.createdAt)}
              </span>
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
          </div>

          {/* Post Content */}
          <p className="mt-2 text-sm whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {/* Actions */}
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

          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 space-y-3">
              {loadingComments ? (
                <p className="text-xs text-muted-foreground">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      {comment.authorUsername ? (
                        <Link href={`/u/${comment.authorUsername}`}>
                          <Avatar className="h-7 w-7 hover:ring-2 hover:ring-green-500 transition-shadow cursor-pointer">
                            <AvatarFallback className="text-xs bg-muted">
                              {comment.authorInitials}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                      ) : (
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-muted">
                            {comment.authorInitials}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {comment.authorUsername ? (
                            <Link href={`/u/${comment.authorUsername}`} className="text-xs font-medium hover:text-green-600 dark:hover:text-green-400 hover:underline transition-colors">
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
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
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
  );
}
