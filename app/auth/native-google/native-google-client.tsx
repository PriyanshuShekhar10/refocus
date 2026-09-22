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

let bootstrapped = false;

function bounceUrl(params: Record<string, string>) {
  const url = new URL(NATIVE_RETURN_TO);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
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
    localStorage.setItem(STARTED_KEY, "1");
  } catch {
    // Storage can be blocked in an ephemeral auth session.
  }
}

function consumeStarted() {
  try {
    const started =
      sessionStorage.getItem(STARTED_KEY) === "1" ||
      localStorage.getItem(STARTED_KEY) === "1";
    sessionStorage.removeItem(STARTED_KEY);
    localStorage.removeItem(STARTED_KEY);
    return started;
  } catch {
    return false;
  }
}

function cameBackFromGoogle() {
  const ref = document.referrer || "";
  return /google\.com|gstatic\.com|firebaseapp\.com|googleusercontent\.com/i.test(
    ref,
  );
}

async function waitForRedirectUser() {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const result = await getRedirectResult(auth);
  return result?.user ?? auth.currentUser ?? null;
}

async function hrefForUser(user: User) {
  const firebaseIdToken = await user.getIdToken();
  return bounceUrl({
    firebaseIdToken,
    ...(user.displayName ? { displayName: user.displayName } : {}),
  });
}

function openRefocus(href: string) {
  window.location.href = href;
}

export function NativeGoogleClient() {
  const [status, setStatus] = useState("Checking Google sign-in…");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [returnHref, setReturnHref] = useState<string | null>(null);

  async function completeUser(user: User) {
    consumeStarted();
    const href = await hrefForUser(user);
    setReturnHref(href);
    setStatus("Opening Refocus…");
    setBusy(false);
    setError(null);
    openRefocus(href);
  }

  async function startGoogle() {
    if (!isFirebaseClientConfigured()) {
      openRefocus(bounceUrl({ error: "Google sign-in is not configured." }));
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Continuing with Google…");
    markStarted();
    const auth = getFirebaseAuth();
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      await completeUser(credential.user);
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
    await signInWithRedirect(auth, googleAuthProvider);
  }

  useEffect(() => {
    if (bootstrapped) {
      return;
    }
    bootstrapped = true;
    let cancelled = false;

    (async () => {
      if (!isFirebaseClientConfigured()) {
        openRefocus(bounceUrl({ error: "Google sign-in is not configured." }));
        return;
      }

      const user = await waitForRedirectUser();
      if (cancelled) {
        return;
      }
      if (user) {
        await completeUser(user);
        return;
      }

      if (consumeStarted() || cameBackFromGoogle()) {
        setError("Google sign-in did not complete. Please try again.");
        setBusy(false);
        return;
      }

      setBusy(false);
      setStatus("Continue with Google to return to Refocus.");
    })().catch((err) => {
      if (cancelled) {
        return;
      }
      setError(formatFirebaseAuthError(err));
      setBusy(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (returnHref) {
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
        <p className={designStyles.pageSub} style={{ marginTop: 0, fontSize: 14 }}>
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
      ) : busy ? (
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
      ) : (
        <p className={designStyles.pageSub} style={{ marginTop: 0, fontSize: 14 }}>
          {status}
        </p>
      )}
      {!busy ? (
        <DButton
          type="button"
          variant="primary"
          size="lg"
          onClick={() => {
            void startGoogle().catch((err) => {
              setError(formatFirebaseAuthError(err));
              setBusy(false);
            });
          }}
        >
          Continue with Google
        </DButton>
      ) : null}
    </div>
  );
}
