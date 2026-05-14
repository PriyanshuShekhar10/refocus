"use client";
import { useState, useEffect } from "react";

export default function ClientCall({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyUrl, setDailyUrl] = useState<string | null>(null);

  useEffect(() => {
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

        // Fetch session details to know if user selected quiet
        const resInfo = await fetch(`/api/sessions/${sessionId}`);
        const info = await resInfo.json().catch(() => ({}));
        const youQuiet: boolean = Boolean(info?.youQuiet);

        const tokenRes = await fetch(`/api/sessions/${sessionId}/daily/token`, {
          method: "POST",
        });
        if (!tokenRes.ok) {
          const data = await tokenRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to initialize Daily call");
        }

        const tokenData = (await tokenRes.json()) as {
          domain?: string;
          roomName?: string;
          token?: string;
        };
        if (!tokenData.domain || !tokenData.roomName || !tokenData.token) {
          throw new Error("Invalid Daily token response");
        }

        const query = new URLSearchParams({
          t: tokenData.token,
        });
        if (youQuiet) {
          query.set("startAudioOff", "true");
          query.set("startVideoOff", "true");
        }

        const url = `https://${tokenData.domain}/${tokenData.roomName}?${query.toString()}`;
        if (cancelled) return;
        setDailyUrl(url);
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
  if (!dailyUrl) return null;

  return (
    <div className="mt-6">
      <iframe
        src={dailyUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-read; clipboard-write"
        title="Daily Meeting"
        className="h-[70vh] w-full rounded-md border"
      />
    </div>
  );
}
