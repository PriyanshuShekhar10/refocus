"use client";

import { useCallback, useEffect, useState } from "react";

export const COMMUNITY_BANNED_MESSAGE =
  "You are banned from the community and cannot book sessions.";

export const COMMUNITY_MUTED_MESSAGE = "You are muted in the community.";

export function useCommunityModeration() {
  const [communityBanned, setCommunityBanned] = useState(false);
  const [communityMuted, setCommunityMuted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) return;
      const data = await res.json();
      setCommunityBanned(data?.user?.communityBanned === true);
      setCommunityMuted(data?.user?.communityMuted === true);
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    communityBanned,
    communityMuted,
    loaded,
    canBookSessions: !communityBanned,
    bannedMessage: COMMUNITY_BANNED_MESSAGE,
    mutedMessage: COMMUNITY_MUTED_MESSAGE,
    refresh,
  };
}
