"use client";

// Composite browser fingerprint (canvas, WebGL, fonts, screen, audio, etc.)
// via the open-source FingerprintJS community edition. Best-effort device
// signal for admin fraud triage — not a security boundary, and distinct
// browser profiles/incognito/cleared storage will still produce a new id.

let cached: Promise<string | null> | null = null;

export function getBrowserFingerprint(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!cached) {
    cached = import("@fingerprintjs/fingerprintjs")
      .then((FingerprintJS) => FingerprintJS.load())
      .then((agent) => agent.get())
      .then((result) => result.visitorId)
      .catch(() => null);
  }
  return cached;
}
