"use client";

import { useCallback, useEffect, useState } from "react";
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE } from "@/lib/emailVerificationMessages";

export function useEmailVerified() {
  const [verified, setVerified] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) {
        setVerified(null);
        return;
      }
      const data = await res.json();
      setVerified(!!data?.user?.emailVerified);
    } catch {
      setVerified(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    verified,
    loading: verified === null,
    /** Block only when we know the address is unverified (not while loading). */
    canInteract: verified !== false,
    message: EMAIL_VERIFICATION_REQUIRED_MESSAGE,
    refresh,
  };
}
