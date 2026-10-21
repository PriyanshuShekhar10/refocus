"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseClientConfigured()) {
    throw new Error("Firebase is not configured");
  }
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Sign in with Apple (web). Needs the Apple provider's web settings in Firebase
 * (Services ID, team ID, key ID, private key); hidden until
 * NEXT_PUBLIC_APPLE_SIGNIN_ENABLED=true.
 */
export const appleAuthProvider = new OAuthProvider("apple.com");
appleAuthProvider.addScope("email");
appleAuthProvider.addScope("name");

export function isAppleSignInEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APPLE_SIGNIN_ENABLED === "true";
}
