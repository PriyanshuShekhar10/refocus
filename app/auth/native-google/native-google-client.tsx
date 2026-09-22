"use client";

import { useEffect, useState } from "react";
import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import { Loader2 } from "lucide-react";
import { DButton, designStyles } from "@/components/design";
import {
  getFirebaseAuth,
  googleAuthProvider,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";

const NATIVE_RETURN_TO = "refocus://google-auth";
const STARTED_KEY = "refocus.native-google.started";

// Survives React Strict Mode remounts in the same page load; resets on a real navigation.
let bootstrapped = false;

function bounce(params: Record<string, string>) {
  const url = new URL(NATIVE_RETURN_TO);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  window.location.href = url.toString();
}

function formatFirebaseAuthError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    if (code === "auth/unauthorized-domain") {
      return "This domain is not authorized for Firebase sign-in.";
    }
    if (code === "auth/operation-not-allowed") {
      return "Google sign-in is not enabled.";
    }
    if (
      "message" in err &&
      typeof (err as { message?: string }).message === "string"
    ) {
      return (err as { message: string }).message;
    }
    return code;
  }
  return err instanceof Error ? err.message : "Google sign-in failed. Please try again.";
}

function markStarted() {
  try {
    sessionStorage.setItem(STARTED_KEY, "1");
  } catch {
    // sessionStorage can be blocked in an ephemeral auth session.
  }
}

function consumeStarted() {
  try {
    const started = sessionStorage.getItem(STARTED_KEY) === "1";
    sessionStorage.removeItem(STARTED_KEY);
    return started;
  } catch {
    return false;
  }
}

async function bounceUser(user: User) {
  const firebaseIdToken = await user.getIdToken();
  bounce({
    firebaseIdToken,
    ...(user.displayName ? { displayName: user.displayName } : {}),
  });
}

async function startGoogle(preferPopup: boolean) {
  if (!isFirebaseClientConfigured()) {
    bounce({ error: "Google sign-in is not configured." });
    return;
  }
  markStarted();
  const auth = getFirebaseAuth();
  if (preferPopup) {
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      await bounceUser(credential.user);
      return;
    } catch (popupErr: unknown) {
      const code =
        popupErr && typeof popupErr === "object" && "code" in popupErr
          ? String((popupErr as { code: string }).code)
          : "";
      if (
        code !== "auth/popup-blocked" &&
        code !== "auth/popup-closed-by-user" &&
        code !== "auth/cancelled-popup-request"
      ) {
        throw popupErr;
      }
    }
  }
  // Google's redirect_uri is Firebase's registered handler, not this page.
  await signInWithRedirect(auth, googleAuthProvider);
}

export function NativeGoogleClient() {
  const [status, setStatus] = useState("Continuing with Google…");
  const [error, setError] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (bootstrapped) {
      return;
    }
    bootstrapped = true;
    let cancelled = false;

    (async () => {
      if (!isFirebaseClientConfigured()) {
        bounce({ error: "Google sign-in is not configured." });
        return;
      }

      const auth = getFirebaseAuth();
      await auth.authStateReady();
      const result = await getRedirectResult(auth);
      const user = result?.user ?? auth.currentUser;
      if (user) {
        consumeStarted();
        await bounceUser(user);
        return;
      }

      if (consumeStarted()) {
        if (!cancelled) {
          setError("Google sign-in did not complete. Please try again.");
          setShowRetry(true);
        }
        return;
      }

      if (cancelled) {
        return;
      }
      setStatus("Redirecting to Google…");
      await startGoogle(false);
    })().catch((err) => {
      if (cancelled) {
        return;
      }
      setError(formatFirebaseAuthError(err));
      setShowRetry(true);
    });

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
            void startGoogle(true).catch((err) => {
              setError(formatFirebaseAuthError(err));
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
