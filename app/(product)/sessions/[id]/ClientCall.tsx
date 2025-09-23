"use client";
import React from "react";

export default function ClientCall({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // DAILY: preserved but unused for now (free alternative in use)
  // const [domain, setDomain] = React.useState<string | null>(null);
  // const [roomName, setRoomName] = React.useState<string | null>(null);
  // const [token, setToken] = React.useState<string | null>(null);
  // JITSI (free alternative)
  const [jitsiUrl, setJitsiUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // Add current user as a participant (idempotent; 409 means already full)
        const resJoin = await fetch(`/api/sessions/${sessionId}/join`, {
          method: "POST",
        });
        if (!resJoin.ok && resJoin.status !== 409) {
          const data = await resJoin.json().catch(() => ({}));
          throw new Error(data.error || "Failed to join session");
        }
        // FREE ALTERNATIVE: Jitsi Meet on public meet.jit.si (no API key required)
        // We derive a deterministic room name per session. sessionId is hex-safe for URLs.
        const rn = `session-${sessionId}`;
        // You can pass more config via hash params (e.g., disable prejoin, etc.)
        // See https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe
        const url = `https://meet.jit.si/${rn}#config.prejoinConfig.enabled=true`;
        if (cancelled) return;
        setJitsiUrl(url);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading)
    return <div className="mt-6 text-sm text-gray-500">Loading call…</div>;
  if (error) return <div className="mt-6 text-sm text-red-600">{error}</div>;
  if (!jitsiUrl) return null;

  // Jitsi embed via iframe (FREE). Daily code preserved below as comments for later use.
  return (
    <div className="mt-6">
      <iframe
        src={jitsiUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-read; clipboard-write"
        title="Jitsi Meeting"
        className="h-[70vh] w-full rounded-md border"
      />

      {/**
       * DAILY (commented):
       *
       * if (!domain || !roomName || !token) return null;
       * const dailyUrl = `https://${domain}/${roomName}?t=${encodeURIComponent(token)}`;
       * return (
       *   <iframe
       *     src={dailyUrl}
       *     allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-read; clipboard-write"
       *     title="Daily Meeting"
       *     className="h-[70vh] w-full rounded-md border"
       *   />
       * );
       */}
    </div>
  );
}
