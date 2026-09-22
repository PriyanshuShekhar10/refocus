"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { DButton, designStyles } from "@/components/design";

const NATIVE_RETURN_TO = "refocus://google-auth";
const SID_KEY = "refocus.native-google.sessionId";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

type IdpResponse = {
  idToken?: string;
  displayName?: string;
  error?: { message?: string };
};

function bounce(params: Record<string, string>) {
  const url = new URL(NATIVE_RETURN_TO);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  window.location.href = url.toString();
}

function continueUri() {
  return `${window.location.origin}${window.location.pathname}`;
}

function readStoredSessionId() {
  try {
    return (
      sessionStorage.getItem(SID_KEY) ||
      localStorage.getItem(SID_KEY) ||
      document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${SID_KEY}=`))
        ?.split("=")[1] ||
      ""
    );
  } catch {
    return "";
  }
}

function storeSessionId(sessionId: string) {
  try {
    sessionStorage.setItem(SID_KEY, sessionId);
    localStorage.setItem(SID_KEY, sessionId);
    document.cookie = `${SID_KEY}=${sessionId}; path=/; max-age=600; samesite=lax`;
  } catch {
    // Storage can be blocked in an ephemeral auth session.
  }
}

function clearSessionId() {
  try {
    sessionStorage.removeItem(SID_KEY);
    localStorage.removeItem(SID_KEY);
    document.cookie = `${SID_KEY}=; path=/; max-age=0`;
  } catch {
    // ignore
  }
}

function callbackParams() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    error: query.get("error") || hash.get("error"),
    errorDescription: query.get("error_description") || hash.get("error_description"),
    code: query.get("code"),
    idToken: hash.get("id_token"),
    accessToken: hash.get("access_token"),
  };
}

async function signInWithIdp(input: {
  requestUri: string;
  postBody?: string;
  sessionId?: string;
}) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestUri: input.requestUri,
        returnSecureToken: true,
        returnIdpCredential: true,
        ...(input.postBody ? { postBody: input.postBody } : {}),
        ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      }),
    },
  );
  const data = (await res.json()) as IdpResponse;
  if (!res.ok || !data.idToken) {
    throw new Error(data.error?.message || "Google sign-in failed. Please try again.");
  }
  return {
    firebaseIdToken: data.idToken,
    displayName: data.displayName?.trim() || null,
  };
}

async function completeFromCallback(): Promise<boolean> {
  const { error, errorDescription, code, idToken, accessToken } = callbackParams();
  if (error) {
    bounce({ error: errorDescription || error });
    return true;
  }
  if (!code && !idToken && !accessToken) {
    return false;
  }

  const sessionId = readStoredSessionId();
  const requestUri = window.location.href;
  const postBody = idToken
    ? `id_token=${encodeURIComponent(idToken)}&providerId=google.com`
    : accessToken
      ? `access_token=${encodeURIComponent(accessToken)}&providerId=google.com`
      : undefined;

  const exchanged = await signInWithIdp({
    requestUri,
    postBody,
    sessionId,
  });
  clearSessionId();
  bounce({
    firebaseIdToken: exchanged.firebaseIdToken,
    ...(exchanged.displayName ? { displayName: exchanged.displayName } : {}),
  });
  return true;
}

async function startGoogleRedirect() {
  if (!API_KEY || !isFirebaseClientConfigured()) {
    bounce({ error: "Google sign-in is not configured." });
    return;
  }
  const sessionId = crypto.randomUUID().replace(/-/g, "");
  storeSessionId(sessionId);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        continueUri: continueUri(),
        providerId: "google.com",
        sessionId,
        authFlowType: "CODE_FLOW",
        oauthScope: "openid email profile",
      }),
    },
  );
  const data = (await res.json()) as {
    authUri?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data.authUri) {
    throw new Error(data.error?.message || "Could not start Google sign-in.");
  }
  window.location.assign(data.authUri);
}

export function NativeGoogleClient() {
  const [status, setStatus] = useState("Continuing with Google…");
  const [error, setError] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    let cancelled = false;

    (async () => {
      try {
        const returning = Boolean(readStoredSessionId());
        if (await completeFromCallback()) {
          return;
        }
        if (cancelled) {
          return;
        }
        if (returning) {
          throw new Error("Google sign-in did not complete. Please try again.");
        }
        setStatus("Redirecting to Google…");
        await startGoogleRedirect();
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Google sign-in failed.");
        setShowRetry(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 16,
        minHeight: 180,
        justifyContent: "center",
      }}
    >
      {error ? (
        <>
          <h1
            className={designStyles.pageTitle}
            style={{ fontSize: 28, marginTop: 0 }}
          >
            Couldn’t continue with Google
          </h1>
          <p className={designStyles.pageSub} style={{ marginTop: 0, fontSize: 14 }}>
            {error}
          </p>
        </>
      ) : (
        <>
          <Loader2
            size={28}
            className="animate-spin"
            style={{ color: "var(--ink)" }}
            aria-hidden
          />
          <p
            role="status"
            aria-live="polite"
            className={designStyles.pageSub}
            style={{ marginTop: 0, fontSize: 14 }}
          >
            {status}
          </p>
        </>
      )}
      {showRetry ? (
        <DButton
          type="button"
          variant="primary"
          size="lg"
          onClick={() => {
            setError(null);
            setShowRetry(false);
            setStatus("Redirecting to Google…");
            void startGoogleRedirect().catch((err) => {
              setError(err instanceof Error ? err.message : "Google sign-in failed.");
              setShowRetry(true);
            });
          }}
        >
          Continue with Google
        </DButton>
      ) : null}
    </div>
  );
}
