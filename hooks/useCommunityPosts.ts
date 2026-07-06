"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { swrKeys } from "@/lib/swr/keys";
import type { Post } from "@/app/(product)/components/Community/PostCard";

type PostsResponse = {
  posts?: Post[];
  nextCursor?: string | null;
};

export function useCommunityPosts(limit = 20) {
  const key = swrKeys.communityPosts(limit);
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<PostsResponse>(key);

  const loadMore = useCallback(
    async (cursor: string) => {
      const res = await fetch(swrKeys.communityPostsPage(cursor, limit));
      const page = (await res.json()) as PostsResponse;
      if (!res.ok) {
        throw new Error(
          page && typeof page === "object" && "error" in page
            ? String((page as { error: unknown }).error)
            : "Failed to load more posts",
        );
      }
      await mutate(
        (current) => ({
          posts: [...(current?.posts ?? []), ...(page.posts ?? [])],
          nextCursor: page.nextCursor ?? null,
        }),
        { revalidate: false },
      );
      return page;
    },
    [limit, mutate],
  );

  const prependPost = useCallback(
    (post: Post) => {
      mutate(
        (current) => ({
          posts: [post, ...(current?.posts ?? [])],
          nextCursor: current?.nextCursor ?? null,
        }),
        { revalidate: false },
      );
    },
    [mutate],
  );

  const updatePosts = useCallback(
    (updater: (posts: Post[]) => Post[]) => {
      mutate(
        (current) => ({
          posts: updater(current?.posts ?? []),
          nextCursor: current?.nextCursor ?? null,
        }),
        { revalidate: false },
      );
    },
    [mutate],
  );

  return {
    posts: data?.posts ?? [],
    nextCursor: data?.nextCursor ?? null,
    loading: isLoading && !data,
    isValidating,
    error: error ? (error as Error).message : null,
    refresh: mutate,
    loadMore,
    prependPost,
    updatePosts,
  };
}
