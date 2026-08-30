"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import MentionComposer from "@/components/community/MentionComposer";
import { Loader2, MessageSquare, Users, X } from "lucide-react";
import PostCard, { Comment } from "./PostCard";
import WelcomeBoard from "./WelcomeBoard";
import WelcomeBoardPanel from "./WelcomeBoardPanel";
import { useEmailVerified } from "@/hooks/useEmailVerified";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { useWallpaperActive } from "@/components/wallpaper-context";
import { useCommunityPanelLayout } from "@/hooks/useCommunityPanelLayout";
import { useCommunityPosts } from "@/hooks/useCommunityPosts";
import { useAdminMe } from "@/hooks/useAdminMe";
import useSWR from "swr";
import { swrKeys } from "@/lib/swr/keys";

type MobileCommunityView = "feed" | "welcome";

type ProfilePreviewPayload = {
  username: string;
  name: string;
  about?: string | null;
  avatarUrl?: string | null;
};

interface CommunityProps {
  onPreviewProfile?: (profile: ProfilePreviewPayload) => void;
}

const GUIDELINES_STORAGE_KEY = "refocus-community-guidelines-collapsed";

const COMMUNITY_GUIDELINES = `This space is for supportive accountability and steady progress. Please keep it kind and useful for everyone:

• Be respectful. No harassment, bullying, hate speech, or personal attacks.
• Keep posts constructive and on-topic (focus, study, work, goals, habits).
• No spam, promotions, or repeated self-advertising.
• Protect privacy. Don't share private info (yours or someone else's).
• Encourage others. Celebrate wins and help when someone is stuck.

How to use this platform:
• Use Dashboard to plan and join sessions.
• Use Friends to build accountability circles.
• Use Community to share progress, ask for advice, and motivate each other.

We're glad you're here. Let's build a friendly, focused community together.`;

function loadGuidelinesCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GUIDELINES_STORAGE_KEY) === "1";
}

function GuidelinesDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-guidelines-title"
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="community-guidelines-title"
            className="text-base font-semibold"
          >
            Community guidelines
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {COMMUNITY_GUIDELINES}
        </p>
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#5D1C6A] hover:bg-[#CA5995]"
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}

function PinnedWelcome({
  collapsed,
  onOpenGuidelines,
}: {
  collapsed: boolean;
  onOpenGuidelines: () => void;
}) {
  if (collapsed) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/50 px-3 py-2">
        <p className="text-sm text-foreground">
          <span className="mr-1.5" aria-hidden>
            📌
          </span>
          Community guidelines
        </p>
        <button
          type="button"
          onClick={onOpenGuidelines}
          className="shrink-0 text-xs font-medium text-[#5D1C6A] hover:underline dark:text-[#CA5995]"
        >
          View →
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-[#5D1C6A]/25 border-l-[3px] border-l-[#5D1C6A] bg-card/60 px-3 py-2.5 dark:border-[#CA5995]/30 dark:border-l-[#CA5995]">
      <p className="text-sm font-medium text-foreground">
        <span className="mr-1.5" aria-hidden>
          📌
        </span>
        Welcome to Refocus Community
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        A space for supportive accountability and steady progress.
      </p>
      <button
        type="button"
        onClick={onOpenGuidelines}
        className="mt-2 text-xs font-medium text-[#5D1C6A] hover:underline dark:text-[#CA5995]"
      >
        Read community guidelines →
      </button>
    </div>
  );
}

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
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [guidelinesCollapsed, setGuidelinesCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<MobileCommunityView>("feed");
  const { isMobile } = useIsMobileShell();
  const wallpaperActive = useWallpaperActive();
  const { layout, setLayout, chatWidth } = useCommunityPanelLayout();
  const { isAdmin } = useAdminMe();
  const { data: meData } = useSWR<{
    user?: {
      communityBanned?: boolean;
      communityMuted?: boolean;
      avatarUrl?: string | null;
    };
  }>(swrKeys.userMe);
  const communityBanned = meData?.user?.communityBanned === true;
  const communityMuted = meData?.user?.communityMuted === true;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { canInteract, message: verifyMessage } = useEmailVerified();

  const canParticipate = canInteract && !communityBanned && !communityMuted;
  const participationMessage = communityBanned
    ? "You are banned from the community."
    : communityMuted
      ? "You are muted in the community."
      : !canInteract
        ? verifyMessage
        : undefined;

  useEffect(() => {
    setGuidelinesCollapsed(loadGuidelinesCollapsed());
  }, []);

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

  useEffect(() => {
    if (!composerExpanded) return;
    const id = window.setTimeout(() => {
      composerTextareaRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [composerExpanded]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          setLoadingMore(true);
          void loadMore(nextCursor).finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "100px" },
    );

    const ref = loadMoreRef.current;
    if (ref) observer.observe(ref);

    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, [nextCursor, loadingMore, loadMore]);

  const collapseComposer = () => {
    setNewPostContent("");
    setComposerExpanded(false);
  };

  const openGuidelines = () => {
    setGuidelinesOpen(true);
    setGuidelinesCollapsed(true);
    localStorage.setItem(GUIDELINES_STORAGE_KEY, "1");
  };

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
        collapseComposer();
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
      // ignore
    }
  };

  const handleDelete = async (postId: string) => {
    if (!canInteract) return;
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
    content: string,
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
          <div>
            <h1 className="text-xl font-semibold">Community</h1>
            <p className="text-sm text-muted-foreground">
              Share updates and connect with others.
            </p>
          </div>
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
              onClick={() => setMobileView("welcome")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mobileView === "welcome"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Recently joined
            </button>
          </div>
        </div>
      )}

      {/* Main Feed */}
      <div
        className={`flex min-h-0 flex-col ${
          isMobile && mobileView === "welcome"
            ? "hidden"
            : "flex-1 min-w-0"
        } ${!isMobile && wallpaperActive ? "lg:rounded-2xl lg:border lg:border-border/60" : ""}`}
      >
        {!isMobile && (
          <div className="shrink-0 border-b border-border px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Community</h1>
                <p className="text-sm text-muted-foreground">
                  Share updates and connect with others.
                </p>
              </div>
              {layout === "feed" ? (
                <button
                  type="button"
                  onClick={() => setLayout("split")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/70 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Users className="h-3.5 w-3.5" />
                  Recently joined
                </button>
              ) : null}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-4 py-4">
            {/* Composer */}
            <div
              className={`mb-4 rounded-lg border border-border ${
                wallpaperActive ? "bg-card" : "bg-card/40"
              }`}
            >
              {!composerExpanded ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!canParticipate) return;
                    setComposerExpanded(true);
                  }}
                  disabled={!canParticipate}
                  title={!canParticipate ? participationMessage : undefined}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    {currentUserAvatarUrl ? (
                      <AvatarImage
                        src={currentUserAvatarUrl}
                        alt={currentUserName}
                      />
                    ) : null}
                    <AvatarFallback className="bg-muted text-xs">
                      {currentUserInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {canParticipate
                      ? "Share an update..."
                      : participationMessage}
                  </span>
                </button>
              ) : (
                <div className="p-3">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      {currentUserAvatarUrl ? (
                        <AvatarImage
                          src={currentUserAvatarUrl}
                          alt={currentUserName}
                        />
                      ) : null}
                      <AvatarFallback className="bg-muted text-xs">
                        {currentUserInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1.5 text-sm font-medium">
                        What&apos;s on your mind?
                      </p>
                      <MentionComposer
                        multiline
                        inputRef={composerTextareaRef}
                        value={newPostContent}
                        onChange={setNewPostContent}
                        placeholder="Share an update… type @name to tag someone"
                        disabled={!canParticipate || posting}
                        className="min-h-[88px] resize-none border-0 p-0 shadow-none focus-visible:ring-0"
                      />
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={collapseComposer}
                          disabled={posting}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => void handlePost()}
                          disabled={
                            !canParticipate ||
                            !newPostContent.trim() ||
                            posting
                          }
                          className="bg-[#5D1C6A] hover:bg-[#CA5995]"
                        >
                          {posting ? (
                            <>
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
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
              )}
            </div>

            <PinnedWelcome
              collapsed={guidelinesCollapsed}
              onOpenGuidelines={openGuidelines}
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/70">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
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
                  ))}
                </div>
                {posts.length === 0 && (
                  <div className="py-12 text-center">
                    <MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      No community posts yet
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Be the first member to share an update.
                    </p>
                  </div>
                )}
              </>
            )}

            <div ref={loadMoreRef} className="h-4" />
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>

      {!isMobile && layout === "split" ? (
        <WelcomeBoardPanel
          layout={layout}
          chatWidth={chatWidth}
          onLayoutChange={setLayout}
          onPreviewProfile={onPreviewProfile}
        />
      ) : null}

      {isMobile && mobileView === "welcome" && (
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-1 lg:hidden">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/80">
            <WelcomeBoard onPreviewProfile={onPreviewProfile} />
          </div>
        </div>
      )}

      <GuidelinesDialog
        open={guidelinesOpen}
        onClose={() => setGuidelinesOpen(false)}
      />
    </div>
  );
}
