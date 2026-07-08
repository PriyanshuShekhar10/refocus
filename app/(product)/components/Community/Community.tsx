"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare } from "lucide-react";
import PostCard, { Post, Comment } from "./PostCard";
import CommunityChat from "./CommunityChat";
import CommunityChatPanel from "./CommunityChatPanel";
import { useEmailVerified } from "@/hooks/useEmailVerified";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { useWallpaperActive } from "@/components/wallpaper-context";
import { useCommunityPanelLayout } from "@/hooks/useCommunityPanelLayout";
import { useCommunityPosts } from "@/hooks/useCommunityPosts";
import { useAdminMe } from "@/hooks/useAdminMe";
import useSWR from "swr";
import { swrKeys } from "@/lib/swr/keys";

type MobileCommunityView = "feed" | "chat";

type ProfilePreviewPayload = {
  username: string;
  name: string;
  about?: string | null;
  avatarUrl?: string | null;
};

interface CommunityProps {
  onPreviewProfile?: (profile: ProfilePreviewPayload) => void;
}

const PINNED_ADMIN_POST: Post = {
  id: "admin-pinned-welcome",
  content: `Hey everyone, welcome to Refocus Community.

This space is for supportive accountability and steady progress. Please keep it kind and useful for everyone:

- Be respectful. No harassment, bullying, hate speech, or personal attacks.
- Keep posts constructive and on-topic (focus, study, work, goals, habits).
- No spam, promotions, or repeated self-advertising.
- Protect privacy. Don't share private info (yours or someone else's).
- Encourage others. Celebrate wins and help when someone is stuck.

How to use this platform:
- Use Dashboard to plan and join sessions.
- Use Friends to build accountability circles.
- Use Community to share progress, ask for advice, and motivate each other.

We're glad you're here. Let's build a friendly, focused community together.`,
  createdAt: "2026-05-16T00:00:00.000Z",
  authorId: "admin",
  authorName: "Admin",
  authorUsername: null,
  authorInitials: "AD",
  authorIsAdmin: true,
  likesCount: 0,
  commentsCount: 0,
  isLiked: false,
  isPinned: true,
};

export default function Community({ onPreviewProfile }: CommunityProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const currentUserName =
    (session?.user as { name?: string } | undefined)?.name || "User";
  const currentUserInitials = currentUserName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(
    session?.user?.image ?? null,
  );

  const {
    posts,
    nextCursor,
    loading,
    loadMore,
    prependPost,
    updatePosts,
    refresh: refreshPosts,
  } = useCommunityPosts();
  const [loadingMore, setLoadingMore] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [mobileView, setMobileView] = useState<MobileCommunityView>("feed");
  const { isMobile } = useIsMobileShell();
  const wallpaperActive = useWallpaperActive();
  const { layout, setLayout, chatWidth, startResize } = useCommunityPanelLayout();
  const { isAdmin } = useAdminMe();
  const { data: meData } = useSWR<{ user?: { communityBanned?: boolean; communityMuted?: boolean; avatarUrl?: string | null } }>(
    swrKeys.userMe,
  );
  const communityBanned = meData?.user?.communityBanned === true;
  const communityMuted = meData?.user?.communityMuted === true;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { canInteract, message: verifyMessage } = useEmailVerified();

  const canParticipate =
    canInteract && !communityBanned && !communityMuted;
  const participationMessage = communityBanned
    ? "You are banned from the community."
    : communityMuted
      ? "You are muted in the community."
      : !canInteract
        ? verifyMessage
        : undefined;

  useEffect(() => {
    const fromSession = session?.user?.image?.trim();
    if (fromSession) {
      setCurrentUserAvatarUrl(fromSession);
      return;
    }
    if (meData?.user?.avatarUrl) {
      setCurrentUserAvatarUrl(meData.user.avatarUrl);
    }
  }, [session?.user?.image, meData?.user?.avatarUrl]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          setLoadingMore(true);
          void loadMore(nextCursor).finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "100px" }
    );

    const ref = loadMoreRef.current;
    if (ref) observer.observe(ref);

    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, [nextCursor, loadingMore, loadMore]);

  const handlePost = async () => {
    if (!canParticipate || !newPostContent.trim() || posting) return;
    setPosting(true);

    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPostContent.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        prependPost(data.post);
        setNewPostContent("");
      }
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!canParticipate) return;
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        updatePosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLiked: data.liked, likesCount: data.likesCount }
              : p,
          ),
        );
      }
    } catch {
      // Revert optimistic update would go here
    }
  };

  const handleDelete = async (postId: string) => {
    if (!canInteract) return;
    // Optimistic delete
    updatePosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        void refreshPosts();
      }
    } catch {
      void refreshPosts();
    }
  };

  const handleComment = async (
    postId: string,
    content: string
  ): Promise<Comment | null> => {
    if (!canParticipate) return null;
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.comment;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const moderateUser = async (
    userId: string,
    action: "ban" | "unban" | "mute" | "unmute",
    muteDays?: number,
  ) => {
    const res = await fetch(`/api/admin/community/users/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, muteDays }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Moderation action failed");
      throw new Error(data.error || "Moderation action failed");
    }
  };

  const handleAdminDeletePost = async (postId: string) => {
    updatePosts((prev) => prev.filter((p) => p.id !== postId));
    const res = await fetch(`/api/admin/posts/${postId}`, { method: "DELETE" });
    if (!res.ok) {
      void refreshPosts();
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to delete post");
    }
  };

  const handleAdminDeleteComment = async (commentId: string) => {
    const res = await fetch(`/api/admin/community/comments/${commentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to delete comment");
      throw new Error(data.error || "Failed to delete comment");
    }
  };

  return (
    <div
      className={`flex h-full min-h-0 flex-col lg:flex-row lg:gap-4 lg:p-4 ${
        wallpaperActive ? "" : "bg-background"
      }`}
    >
      {isMobile && (
        <div className="shrink-0 border-b border-border px-4 py-3">
          <h1 className="text-xl font-semibold">Community</h1>
          <p className="text-sm text-muted-foreground">
            Share updates and connect with others
          </p>
          <div className="mt-3 flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMobileView("feed")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mobileView === "feed"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Feed
            </button>
            <button
              type="button"
              onClick={() => setMobileView("chat")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mobileView === "chat"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Chat
            </button>
          </div>
        </div>
      )}

      {/* Main Feed */}
      <div
        className={`flex min-h-0 flex-col ${
          isMobile && mobileView === "chat"
            ? "hidden"
            : layout === "chat"
              ? "hidden lg:hidden"
              : "flex-1 min-w-0"
        } ${!isMobile && wallpaperActive ? "lg:rounded-2xl lg:border lg:border-border/60" : ""}`}
      >
        {/* Header - desktop only */}
        {!isMobile && (
          <div className="shrink-0 border-b border-border px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Community</h1>
                <p className="text-sm text-muted-foreground">
                  Share updates and connect with others
                </p>
              </div>
              {layout === "feed" ? (
                <button
                  type="button"
                  onClick={() => setLayout("split")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Open chat
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-4">
            {/* Create Post */}
            <div
              className={`border border-border rounded-lg p-4 mb-6 ${
                wallpaperActive ? "bg-card" : ""
              }`}
            >
              <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                  {currentUserAvatarUrl ? (
                    <AvatarImage src={currentUserAvatarUrl} alt={currentUserName} />
                  ) : null}
                  <AvatarFallback className="text-sm bg-muted">
                    {currentUserInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder={
                      canParticipate
                        ? "What's on your mind?"
                        : participationMessage
                    }
                    disabled={!canParticipate}
                    className="min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 shadow-none disabled:opacity-60"
                  />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    {/* <div className="flex gap-2">
                      <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
                        <ImageIcon className="h-4 w-4 mr-1" />
                        Photo
                      </Button>
                    </div> */}
                    <Button
                      size="sm"
                      onClick={handlePost}
                      disabled={!canParticipate || !newPostContent.trim() || posting}
                      title={!canParticipate ? participationMessage : undefined}
                      className="bg-[#5D1C6A] hover:bg-[#CA5995]"
                    >
                      {posting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        "Post"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts Feed */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="border border-border rounded-lg divide-y divide-border">
                  <div className="px-4">
                    <PostCard
                      post={PINNED_ADMIN_POST}
                      currentUserId={currentUserId || ""}
                      isAdmin={isAdmin}
                      onLike={handleLike}
                      onDelete={handleDelete}
                      onComment={handleComment}
                      onAdminDeletePost={isAdmin ? handleAdminDeletePost : undefined}
                      onAdminDeleteComment={
                        isAdmin ? handleAdminDeleteComment : undefined
                      }
                      onModerateUser={isAdmin ? moderateUser : undefined}
                      onPreviewProfile={onPreviewProfile}
                    />
                  </div>
                  {posts.map((post) => (
                    <div key={post.id} className="px-4">
                      <PostCard
                        post={post}
                        currentUserId={currentUserId || ""}
                        isAdmin={isAdmin}
                        onLike={handleLike}
                        onDelete={handleDelete}
                        onComment={handleComment}
                        onAdminDeletePost={
                          isAdmin ? handleAdminDeletePost : undefined
                        }
                        onAdminDeleteComment={
                          isAdmin ? handleAdminDeleteComment : undefined
                        }
                        onModerateUser={isAdmin ? moderateUser : undefined}
                        onPreviewProfile={onPreviewProfile}
                      />
                    </div>
                  ))}
                </div>
                {posts.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No community posts yet</p>
                    <p className="text-sm text-muted-foreground/70">
                      Be the first member to share an update.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Load More Trigger */}
            <div ref={loadMoreRef} className="h-4" />
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat panel - desktop */}
      {!isMobile && layout !== "feed" ? (
        <CommunityChatPanel
          layout={layout}
          chatWidth={chatWidth}
          isAdmin={isAdmin}
          canParticipate={canParticipate}
          participationMessage={participationMessage}
          onLayoutChange={setLayout}
          onResizeStart={startResize}
          onModerateUser={isAdmin ? moderateUser : undefined}
        />
      ) : null}

      {/* Chat - mobile full panel */}
      {isMobile && mobileView === "chat" && (
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-1 lg:hidden">
          <div
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border shadow-sm bg-card"
          >
            <CommunityChat
              isAdmin={isAdmin}
              canParticipate={canParticipate}
              participationMessage={participationMessage}
              onModerateUser={isAdmin ? moderateUser : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
