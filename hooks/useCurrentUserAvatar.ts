"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

/** Session JWT may lack `user.image` until re-login; fall back to /api/users/me. */
export function useCurrentUserAvatar(): string | null {
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    session?.user?.image ?? null,
  );

  useEffect(() => {
    const fromSession = session?.user?.image?.trim();
    if (fromSession) {
      setAvatarUrl(fromSession);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me");
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setAvatarUrl(data?.user?.avatarUrl ?? null);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.image]);

  return avatarUrl;
}
