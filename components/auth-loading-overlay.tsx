"use client";

import { Loader2 } from "lucide-react";

type AuthLoadingOverlayProps = {
  active: boolean;
  label?: string;
};

/**
 * Blocks the auth form while email / Google sign-in is in flight.
 * Stays up through redirect so cold production auth feels intentional.
 */
export function AuthLoadingOverlay({
  active,
  label = "Signing you in…",
}: AuthLoadingOverlayProps) {
  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        borderRadius: "inherit",
        background: "color-mix(in srgb, var(--card, #fff) 88%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <Loader2
        size={28}
        className="animate-spin"
        style={{ color: "var(--ink)" }}
        aria-hidden
      />
      <p
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 500,
          color: "var(--ink)",
          textAlign: "center",
        }}
      >
        {label}
      </p>
    </div>
  );
}
