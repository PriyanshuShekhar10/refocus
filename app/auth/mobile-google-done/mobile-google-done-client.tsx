"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DButton, designStyles } from "@/components/design";

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

function bounceUrl(params: Record<string, string>) {
  const url = new URL(RETURN_TO);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * Prefer the custom scheme; also try an Android Intent URL so Chrome/Custom Tabs
 * reopen the app when plain refocus:// is ignored.
 */
function openRefocus(href: string) {
  window.location.href = href;

  try {
    const parsed = new URL(href);
    if (parsed.protocol !== "refocus:") return;
    const intent = `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=refocus;package=com.refocus.app;end`;
    window.setTimeout(() => {
      window.location.href = intent;
    }, 400);
  } catch {
    // Ignore Intent fallback failures.
  }
}

export function MobileGoogleDoneClient() {
  const [status, setStatus] = useState("Finishing Google sign-in…");
  const [error, setError] = useState<string | null>(null);
  const [returnHref, setReturnHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = paramsFromHash();
      const oauthError = params.get("error")?.trim();
      if (oauthError) {
        const description = params.get("error_description")?.trim();
        const href = bounceUrl({ error: description || oauthError });
        if (cancelled) return;
        setReturnHref(href);
        openRefocus(href);
        return;
      }

      const googleIdToken = params.get("id_token")?.trim();
      if (!googleIdToken) {
        setError("Google did not return a sign-in token.");
        setStatus("Couldn’t finish sign-in");
        return;
      }

      try {
        const res = await fetch("/api/mobile-google/stash", {
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
        const href = bounceUrl({ code: data.code });
        setReturnHref(href);
        setStatus("Returning to Refocus…");
        openRefocus(href);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Could not finish Google sign-in.";
        setError(message);
        setStatus("Couldn’t finish sign-in");
        const href = bounceUrl({ error: message });
        setReturnHref(href);
        openRefocus(href);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (returnHref && !error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          background: "#FFF1D3",
        }}
      >
        <p className={designStyles.pageSub} style={{ margin: 0, fontSize: 14 }}>
          Signed in with Google. Return to the Refocus app to finish.
        </p>
        <DButton as="a" href={returnHref} variant="primary" size="lg">
          Open Refocus
        </DButton>
      </div>
    );
  }

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
        <>
          <p className={designStyles.pageSub} style={{ margin: 0, fontSize: 14 }}>
            {error}
          </p>
          {returnHref ? (
            <DButton as="a" href={returnHref} variant="primary" size="lg">
              Back to Refocus
            </DButton>
          ) : null}
        </>
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
