"use client";
import { useState, useEffect } from "react";

export default function ClientCall({
  sessionId,
  fullScreen = false,
}: {
  sessionId: string;
  fullScreen?: boolean;
}) {
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
          prejoin: "false",
          theme: "light",
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
    return (
      <div
        className={
          fullScreen
            ? "flex min-h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-300"
            : "mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        }
      >
        Preparing your call...
      </div>
    );
  if (error)
    return (
      <div
        className={
          fullScreen
            ? "m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
            : "mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
        }
      >
        {error}
      </div>
    );
  if (!dailyUrl) return null;

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <iframe
          src={dailyUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-read; clipboard-write"
          title="Daily Meeting"
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live Session</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Camera and mic controls are available inside the call.
          </p>
        </div>
        <a
          href={dailyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Open in new tab
        </a>
      </div>
      <iframe
        src={dailyUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-read; clipboard-write"
        title="Daily Meeting"
        className="h-[78vh] w-full bg-slate-100 dark:bg-slate-950"
      />
    </div>
  );
}
