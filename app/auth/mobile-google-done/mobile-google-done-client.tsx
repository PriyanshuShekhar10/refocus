"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { designStyles } from "@/components/design";

const RETURN_TO = "refocus://google-auth";

function paramsFromHash() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const query = window.location.search.startsWith("?")
    ? window.location.search.slice(1)
    : window.location.search;
  return new URLSearchParams(`${query}&${hash}`);
}

export function MobileGoogleDoneClient() {
  const [status, setStatus] = useState("Finishing Google sign-in…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = paramsFromHash();
      const oauthError = params.get("error")?.trim();
      if (oauthError) {
        const description = params.get("error_description")?.trim();
        window.location.href = `${RETURN_TO}?error=${encodeURIComponent(description || oauthError)}`;
        return;
      }

      const googleIdToken = params.get("id_token")?.trim();
      if (!googleIdToken) {
        setError("Google did not return a sign-in token.");
        setStatus("Couldn’t finish sign-in");
        return;
      }

      try {
        const res = await fetch("/api/auth/mobile-google/stash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ googleIdToken }),
        });
        const data = (await res.json()) as { code?: string; error?: string };
        if (!res.ok || !data.code) {
          throw new Error(data.error || "Could not finish Google sign-in.");
        }
        if (cancelled) {
          return;
        }
        setStatus("Returning to Refocus…");
        window.location.href = `${RETURN_TO}?code=${encodeURIComponent(data.code)}`;
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Could not finish Google sign-in.";
        setError(message);
        setStatus("Couldn’t finish sign-in");
        window.location.href = `${RETURN_TO}?error=${encodeURIComponent(message)}`;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
        background: "#FFF1D3",
      }}
    >
      {error ? (
        <p className={designStyles.pageSub} style={{ margin: 0, fontSize: 14 }}>
          {error}
        </p>
      ) : (
        <>
          <Loader2
            size={28}
            className="animate-spin"
            style={{ color: "var(--ink, #0A0A0A)" }}
            aria-hidden
          />
          <p
            role="status"
            aria-live="polite"
            className={designStyles.pageSub}
            style={{ margin: 0, fontSize: 14 }}
          >
            {status}
          </p>
        </>
      )}
    </div>
  );
}
