"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MentionComposer from "@/components/community/MentionComposer";
import { Loader2, MessageSquare, Users } from "lucide-react";
import PostCard, { Comment } from "./PostCard";
import WelcomeBoard from "./WelcomeBoard";
import WelcomeBoardPanel from "./WelcomeBoardPanel";
import { useEmailVerified } from "@/hooks/useEmailVerified";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { useCommunityPanelLayout } from "@/hooks/useCommunityPanelLayout";
import { useCommunityPosts } from "@/hooks/useCommunityPosts";
import { useAdminMe } from "@/hooks/useAdminMe";
import useSWR from "swr";
import { swrKeys } from "@/lib/swr/keys";

type ProfilePreviewPayload = {
  username: string;
  name: string;
  about?: string | null;
  avatarUrl?: string | null;
};

const MAX_POST_LENGTH = 2000;

interface CommunityProps {
  onPreviewProfile?: (profile: ProfilePreviewPayload) => void;
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
  const { isMobile } = useIsMobileShell();
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

  const avatarNode = (
    <Avatar className="h-10 w-10 shrink-0">
      {currentUserAvatarUrl ? (
        <AvatarImage src={currentUserAvatarUrl} alt={currentUserName} />
      ) : null}
      <AvatarFallback className="bg-rf-cream-bg text-sm font-medium text-rf-plum-ink">
        {currentUserInitials}
      </AvatarFallback>
    </Avatar>
  );
  const showPanel = !isMobile && layout === "split";
  const [mobileView, setMobileView] = useState<"feed" | "welcome">("feed");

  return (
    <div className="h-full overflow-y-auto">
      <div
        className={`mx-auto flex max-w-[980px] flex-col gap-5 ${
          isMobile ? "px-3 pb-24 pt-4" : "px-[clamp(16px,3vw,40px)] pb-24 pt-8"
        } box-content`}
      >
        {isMobile ? (
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-xl font-semibold text-rf-ink">Community</h1>
              <p className="text-sm text-rf-ink-mute">
                Share updates and connect with others.
              </p>
            </div>
            <div className="flex rounded-lg bg-rf-line-soft p-1">
              {(["feed", "welcome"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMobileView(v)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mobileView === v
                      ? "bg-rf-card text-rf-ink shadow-sm"
                      : "text-rf-ink-mute"
                  }`}
                >
                  {v === "feed" ? "Feed" : "Recently joined"}
                </button>
              ))}
            </div>
          </div>
        ) : (
        <header className="flex flex-wrap items-end justify-between gap-4 rounded-[14px] border border-rf-line bg-rf-card p-6">
          <div>
            <span className="inline-flex items-center gap-2.5 font-rf-mono text-xs uppercase tracking-[0.04em] text-rf-ink-mute">
              <span aria-hidden className="h-px w-[18px] bg-rf-ink-mute" />
              Community
            </span>
            <h1 className="mt-2 text-[clamp(24px,4vw,32px)] font-medium leading-[1.05] tracking-[-0.04em] text-rf-ink">
              Community
            </h1>
            <p className="mt-2.5 text-sm text-rf-ink-soft">
              Share updates and connect with others
            </p>
          </div>
          {!isMobile && layout === "feed" ? (
            <button
              type="button"
              onClick={() => setLayout("split")}
              className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-rf-line bg-rf-card px-3 text-[12.5px] font-medium text-rf-ink-soft transition-colors hover:text-rf-ink"
            >
              <Users className="h-3.5 w-3.5" />
              Recently joined
            </button>
          ) : null}
        </header>
        )}

        <div className="flex flex-wrap items-start gap-5">
          {isMobile && mobileView === "welcome" ? (
            <div className="flex h-[calc(100vh-220px)] min-h-0 w-full flex-col overflow-hidden rounded-xl border border-rf-line bg-rf-card">
              <WelcomeBoard onPreviewProfile={onPreviewProfile} />
            </div>
          ) : null}
          <section
            className={`min-w-0 flex-[1_1_480px] flex-col gap-4 ${
              isMobile && mobileView === "welcome" ? "hidden" : "flex"
            }`}
          >

            {/* Composer */}
            <div className="rounded-[14px] border border-rf-line bg-rf-card px-[18px] py-4">
              <div className="flex gap-3">
                {avatarNode}
                <div className="min-w-0 flex-1 pt-2">
                  <MentionComposer
                    multiline
                    inputRef={composerTextareaRef}
                    value={newPostContent}
                    onChange={(v) => setNewPostContent(v.slice(0, MAX_POST_LENGTH))}
                    placeholder={
                      canParticipate
                        ? "What's on your mind? Type @name to tag someone"
                        : participationMessage
                    }
                    disabled={!canParticipate || posting}
                    className="min-h-[72px] resize-none border-0 bg-transparent p-0 text-[15px] leading-normal shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-rf-line-soft pt-2.5">
                <span className="font-rf-mono text-[11px] text-rf-ink-mute">
                  {newPostContent.length}/{MAX_POST_LENGTH}
                </span>
                <div className="flex items-center gap-2">
                  {newPostContent ? (
                    <button
                      type="button"
                      onClick={collapseComposer}
                      disabled={posting}
                      className="h-8 rounded-full px-3 text-[13px] font-medium text-rf-ink-soft hover:text-rf-ink"
                    >
                      Clear
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handlePost()}
                    disabled={!canParticipate || !newPostContent.trim() || posting}
                    className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full border border-rf-primary bg-rf-primary px-4 text-[13px] font-medium text-rf-on-primary transition-opacity hover:bg-rf-primary-hover disabled:opacity-55"
                  >
                    {posting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Posting…
                      </>
                    ) : (
                      "Post"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-rf-ink-mute" />
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-[14px] border border-rf-line bg-rf-card py-12 text-center">
                <MessageSquare className="mx-auto mb-3 h-10 w-10 text-rf-ink-mute/50" />
                <p className="text-rf-ink-soft">No community posts yet</p>
                <p className="text-sm text-rf-ink-mute">
                  Be the first member to share an update.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-rf-line rounded-[14px] border border-rf-line bg-rf-card px-[18px]">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
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
                ))}
              </div>
            )}

            <div ref={loadMoreRef} className="h-4" />
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-rf-ink-mute" />
              </div>
            )}
          </section>

          {showPanel ? (
            <WelcomeBoardPanel
              layout={layout}
              chatWidth={chatWidth}
              onLayoutChange={setLayout}
              onPreviewProfile={onPreviewProfile}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
