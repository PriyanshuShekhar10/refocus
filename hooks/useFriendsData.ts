"use client";

import useSWR from "swr";
import { useCallback, type SetStateAction } from "react";
import { swrKeys } from "@/lib/swr/keys";
import type { FriendData } from "@/app/(product)/components/Friends/FriendRow";
import type { FriendRequestData } from "@/app/(product)/components/Friends/FriendRequestCard";
import type { SessionRequestData } from "@/app/(product)/components/Friends/SessionRequestCard";

type FriendsListResponse = { friends?: FriendData[] };
type RequestsResponse = { requests?: FriendRequestData[] };
type SessionRequestsResponse = { requests?: SessionRequestData[] };
type UnreadCountsResponse = { counts?: Record<string, number> };

export function useFriendsData() {
  const incoming = useSWR<RequestsResponse>(swrKeys.friendsIncoming);
  const outgoing = useSWR<RequestsResponse>(swrKeys.friendsOutgoing);
  const friends = useSWR<FriendsListResponse>(swrKeys.friends);
  const sessIncoming = useSWR<SessionRequestsResponse>(
    swrKeys.sessionRequestsIncoming,
  );
  const sessOutgoing = useSWR<SessionRequestsResponse>(
    swrKeys.sessionRequestsOutgoing,
  );
  const unread = useSWR<UnreadCountsResponse>(swrKeys.chatUnreadCounts);

  const refresh = useCallback(async () => {
    await Promise.all([
      incoming.mutate(),
      outgoing.mutate(),
      friends.mutate(),
      sessIncoming.mutate(),
      sessOutgoing.mutate(),
      unread.mutate(),
    ]);
    try {
      window.dispatchEvent(new CustomEvent("friends:session-requests-updated"));
    } catch {
      // ignore
    }
  }, [incoming, outgoing, friends, sessIncoming, sessOutgoing, unread]);

  const hasAnyData =
    friends.data != null ||
    incoming.data != null ||
    outgoing.data != null ||
    sessIncoming.data != null ||
    sessOutgoing.data != null;

  const isInitialLoading =
    !hasAnyData &&
    (friends.isLoading ||
      incoming.isLoading ||
      outgoing.isLoading ||
      sessIncoming.isLoading ||
      sessOutgoing.isLoading);

  const error =
    friends.error ||
    incoming.error ||
    outgoing.error ||
    sessIncoming.error ||
    sessOutgoing.error;

  return {
    incoming: incoming.data?.requests ?? [],
    outgoing: outgoing.data?.requests ?? [],
    friends: friends.data?.friends ?? [],
    sessIncoming: sessIncoming.data?.requests ?? [],
    sessOutgoing: sessOutgoing.data?.requests ?? [],
    unreadCounts: unread.data?.counts ?? {},
    setUnreadCounts: (updater: SetStateAction<Record<string, number>>) => {
      unread.mutate(
        (current) => {
          const prev = current?.counts ?? {};
          const next =
            typeof updater === "function" ? updater(prev) : updater;
          return { counts: next };
        },
        { revalidate: false },
      );
    },
    loading: isInitialLoading,
    isValidating:
      friends.isValidating ||
      incoming.isValidating ||
      outgoing.isValidating ||
      sessIncoming.isValidating ||
      sessOutgoing.isValidating,
    error: error ? (error as Error).message : null,
    refresh,
    mutateFriends: friends.mutate,
  };
}

export function useFriendsList() {
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<FriendsListResponse>(swrKeys.friends);

  return {
    friends: data?.friends ?? [],
    loading: isLoading && data == null,
    loaded: data != null,
    isValidating,
    error: error ? (error as Error).message : null,
    refresh: mutate,
  };
}

export function usePendingSessionRequestsCount() {
  const { data, mutate } = useSWR<SessionRequestsResponse>(
    swrKeys.sessionRequestsIncoming,
  );

  return {
    count: data?.requests?.length ?? 0,
    refresh: mutate,
  };
}
