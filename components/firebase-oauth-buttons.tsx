"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type UserCredential,
} from "firebase/auth";
import {
  getFirebaseAuth,
  googleAuthProvider,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { Loader2 } from "lucide-react";
import { DButton } from "@/components/design";

type FirebaseOAuthButtonsProps = {
  disabled?: boolean;
  onError?: (message: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  onSuccess?: () => void;
};

function extractDisplayName(credential: UserCredential): string | null {
  return credential.user.displayName?.trim() || null;
}

async function completeFirebaseSignIn(
  credential: UserCredential,
): Promise<void> {
  const idToken = await credential.user.getIdToken();
  const displayName = extractDisplayName(credential);
  const res = await signIn("credentials", {
    firebaseIdToken: idToken,
    displayName: displayName ?? undefined,
    redirect: false,
  });

  if (res?.error) {
    if (res.error === "CredentialsSignin") {
      throw new Error("Sign-in failed. Please try again.");
    }
    throw new Error(res.error);
  }
}

function formatFirebaseAuthError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    if (code === "auth/internal-error") {
      return "Google sign-in was blocked by the browser or site policy. Refresh and try again.";
    }
    if (code === "auth/unauthorized-domain") {
      return "This domain is not authorized for Firebase sign-in. Add it under Firebase → Authentication → Settings → Authorized domains.";
    }
    if (code === "auth/popup-closed-by-user") {
      return "Sign-in popup was closed before completing.";
    }
    if (code === "auth/operation-not-allowed") {
      return "Google sign-in is not enabled in Firebase Console. Open Authentication → Sign-in method → Google, set a support email, and click Save.";
    }
    const message =
      "message" in err && typeof (err as { message?: string }).message === "string"
        ? (err as { message: string }).message
        : code;
    return message;
  }
  return err instanceof Error ? err.message : "Sign-in failed. Please try again.";
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function FirebaseOAuthButtons({
  disabled = false,
  onError,
  onLoadingChange,
  onSuccess,
}: FirebaseOAuthButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const setGoogleLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    onLoadingChange?.(loading);
  }, [onLoadingChange]);

  useEffect(() => {
    if (!isFirebaseClientConfigured()) return;

    const auth = getFirebaseAuth();
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result) return;
        setGoogleLoading(true);
        await completeFirebaseSignIn(result);
        // Keep loader up while parent navigates after onSuccess.
        onSuccess?.();
      })
      .catch((err) => {
        console.error("[firebase-oauth] redirect result failed:", err);
        onError?.(formatFirebaseAuthError(err));
        setGoogleLoading(false);
      });
  }, [onError, onSuccess, setGoogleLoading]);

  if (!isFirebaseClientConfigured()) {
    return null;
  }

  const handleGoogleSignIn = async () => {
    if (disabled || isLoading) return;

    setGoogleLoading(true);

    try {
      const auth = getFirebaseAuth();

      try {
        const credential = await signInWithPopup(auth, googleAuthProvider);
        await completeFirebaseSignIn(credential);
        // Keep loader up while parent navigates after onSuccess.
        onSuccess?.();
      } catch (popupErr: unknown) {
        const code =
          popupErr && typeof popupErr === "object" && "code" in popupErr
            ? String((popupErr as { code: string }).code)
            : "";
        if (
          code === "auth/popup-blocked" ||
          code === "auth/popup-closed-by-user"
        ) {
          await signInWithRedirect(auth, googleAuthProvider);
          return;
        }
        throw popupErr;
      }
    } catch (err) {
      console.error("[firebase-oauth] google sign-in failed:", err);
      onError?.(formatFirebaseAuthError(err));
      setGoogleLoading(false);
    }
  };

  return (
    <DButton
      type="button"
      variant="ghost"
      size="lg"
      full
      disabled={disabled || isLoading}
      onClick={handleGoogleSignIn}
      style={{ display: "flex", alignItems: "center", gap: 10 }}
    >
      {isLoading ? (
        <Loader2 size={18} className="animate-spin" aria-hidden />
      ) : (
        <GoogleIcon />
      )}
      {isLoading ? "Signing in…" : "Continue with Google"}
    </DButton>
  );
}

export function AuthDivider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "var(--ink-mute)",
        fontSize: 12,
      }}
    >
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      <span>or continue with email</span>
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </div>
  );
}
