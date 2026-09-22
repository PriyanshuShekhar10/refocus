"use client";

import { useEffect, useState } from "react";
import { getRedirectResult, signInWithRedirect } from "firebase/auth";
import { Loader2 } from "lucide-react";
import {
  getFirebaseAuth,
  googleAuthProvider,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { designStyles } from "@/components/design";

const RETURN_KEY = "refocus.native-google.return_to";
const STARTED_KEY = "refocus.native-google.redirected";

function isSafeNativeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "refocus:") return null;
    if (url.username || url.password) return null;
    return value;
  } catch {
    return null;
  }
}

function bounce(returnTo: string, params: Record<string, string>) {
  const url = new URL(returnTo);
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

type NativeGoogleClientProps = {
  returnToParam: string | null;
};

export function NativeGoogleClient({ returnToParam }: NativeGoogleClientProps) {
  const [status, setStatus] = useState("Continuing with Google…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const returnTo =
        isSafeNativeReturnTo(returnToParam) ||
        isSafeNativeReturnTo(
          typeof window !== "undefined" ? sessionStorage.getItem(RETURN_KEY) : null,
        );

      if (returnTo) {
        sessionStorage.setItem(RETURN_KEY, returnTo);
      }

      if (!returnTo) {
        setError("Open Google sign-in from the Refocus app.");
        return;
      }

      if (!isFirebaseClientConfigured()) {
        bounce(returnTo, { error: "Google sign-in is not configured." });
        return;
      }

      try {
        const auth = getFirebaseAuth();
        const redirectResult = await getRedirectResult(auth);
        if (cancelled) return;

        const user = redirectResult?.user;
        if (user) {
          sessionStorage.removeItem(STARTED_KEY);
          sessionStorage.removeItem(RETURN_KEY);
          const firebaseIdToken = await user.getIdToken();
          const displayName = user.displayName?.trim();
          bounce(returnTo, {
            firebaseIdToken,
            ...(displayName ? { displayName } : {}),
          });
          return;
        }

        if (sessionStorage.getItem(STARTED_KEY) === "1") {
          sessionStorage.removeItem(STARTED_KEY);
          bounce(returnTo, {
            error: "Google sign-in did not complete. Please try again.",
          });
          return;
        }

        sessionStorage.setItem(STARTED_KEY, "1");
        setStatus("Redirecting to Google…");
        await signInWithRedirect(auth, googleAuthProvider);
      } catch (err) {
        if (cancelled) return;
        sessionStorage.removeItem(STARTED_KEY);
        const message = formatFirebaseAuthError(err);
        setError(message);
        bounce(returnTo, { error: message });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [returnToParam]);

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
    </div>
  );
}
