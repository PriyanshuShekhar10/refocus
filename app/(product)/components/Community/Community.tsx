"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImageIcon, MessageSquare } from "lucide-react";
import PostCard, { Post, Comment } from "./PostCard";
import CommunityChat from "./CommunityChat";

export default function Community() {
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

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadPosts = useCallback(async (cursor?: string) => {
    try {
      const url = cursor
        ? `/api/community/posts?cursor=${cursor}&limit=20`
        : "/api/community/posts?limit=20";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (cursor) {
          setPosts((prev) => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts || []);
        }
        setNextCursor(data.nextCursor);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          setLoadingMore(true);
          loadPosts(nextCursor);
        }
      },
      { rootMargin: "100px" }
    );

    const ref = loadMoreRef.current;
    if (ref) observer.observe(ref);

    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, [nextCursor, loadingMore, loadPosts]);

  const handlePost = async () => {
    if (!newPostContent.trim() || posting) return;
    setPosting(true);

    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPostContent.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => [data.post, ...prev]);
        setNewPostContent("");
      }
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLiked: data.liked, likesCount: data.likesCount }
              : p
          )
        );
      }
    } catch {
      // Revert optimistic update would go here
    }
  };

  const handleDelete = async (postId: string) => {
    // Optimistic delete
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        // Revert on failure - would need to store the deleted post
        loadPosts();
      }
    } catch {
      loadPosts();
    }
  };

  const handleComment = async (
    postId: string,
    content: string
  ): Promise<Comment | null> => {
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

  return (
    <div className="flex h-[calc(100vh-3rem)] bg-background">
      {/* Main Feed */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Community</h1>
          <p className="text-sm text-muted-foreground">
            Share updates and connect with others
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-4">
            {/* Create Post */}
            <div className="border border-border rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm bg-muted">
                    {currentUserInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 shadow-none"
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
                      disabled={!newPostContent.trim() || posting}
                      className="bg-green-600 hover:bg-green-700"
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
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No posts yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Be the first to share something!
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg divide-y divide-border">
                {posts.map((post) => (
                  <div key={post.id} className="px-4">
                    <PostCard
                      post={post}
                      currentUserId={currentUserId || ""}
                      onLike={handleLike}
                      onDelete={handleDelete}
                      onComment={handleComment}
                    />
                  </div>
                ))}
              </div>
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

      {/* Chat Sidebar */}
      <div
        className={`hidden lg:flex flex-col w-80 border-l border-border bg-card transition-all ${
          showChat ? "" : "w-0 overflow-hidden"
        }`}
      >
        <CommunityChat />
      </div>

      {/* Mobile Chat Toggle */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="lg:hidden fixed bottom-4 right-4 h-12 w-12 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center hover:bg-green-700 transition-colors"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    </div>
  );
}
