"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import { Loader2 } from "lucide-react";
import {
  getFirebaseAuth,
  googleAuthProvider,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { DButton, designStyles } from "@/components/design";

const NATIVE_RETURN_TO = "refocus://google-auth";

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
      return "Google sign-in is not enabled in Firebase Console.";
    }
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return "Google sign-in was cancelled.";
    }
    if ("message" in err && typeof (err as { message?: string }).message === "string") {
      return (err as { message: string }).message;
    }
    return code;
  }
  return err instanceof Error ? err.message : "Google sign-in failed. Please try again.";
}

async function bounceUser(user: User) {
  const firebaseIdToken = await user.getIdToken();
  const displayName = user.displayName?.trim();
  bounce({
    firebaseIdToken,
    ...(displayName ? { displayName } : {}),
  });
}

export function NativeGoogleClient() {
  const [status, setStatus] = useState("Continuing with Google…");
  const [error, setError] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const started = useRef(false);

  const finishIfSignedIn = useCallback(async (): Promise<boolean> => {
    if (!isFirebaseClientConfigured()) {
      bounce({ error: "Google sign-in is not configured." });
      return true;
    }
    const auth = getFirebaseAuth();
    await auth.authStateReady();
    const redirectResult = await getRedirectResult(auth);
    const user = redirectResult?.user ?? auth.currentUser;
    if (!user) {
      return false;
    }
    setStatus("Returning to Refocus…");
    await bounceUser(user);
    return true;
  }, []);

  const startGoogle = useCallback(async () => {
    setError(null);
    setShowRetry(false);
    setStatus("Continuing with Google…");
    const auth = getFirebaseAuth();
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      await bounceUser(credential.user);
    } catch (popupErr: unknown) {
      const code =
        popupErr && typeof popupErr === "object" && "code" in popupErr
          ? String((popupErr as { code: string }).code)
          : "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        setStatus("Redirecting to Google…");
        await signInWithRedirect(auth, googleAuthProvider);
        return;
      }
      throw popupErr;
    }
  }, []);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    let cancelled = false;

    (async () => {
      try {
        if (await finishIfSignedIn()) {
          return;
        }
        if (cancelled) {
          return;
        }
        await startGoogle();
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(formatFirebaseAuthError(err));
        setShowRetry(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [finishIfSignedIn, startGoogle]);

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
            void startGoogle().catch((err) => {
              setError(formatFirebaseAuthError(err));
            });
          }}
        >
          Continue with Google
        </DButton>
      ) : null}
    </div>
  );
}
