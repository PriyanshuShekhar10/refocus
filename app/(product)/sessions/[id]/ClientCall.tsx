"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";

type Phase = "loading" | "ready" | "in-call" | "ended" | "error";

type PrejoinInfo = {
  partnerName: string | null;
  partnerInitial: string | null;
  durationMin: number;
  sessionType: string;
  sessionName: string | null;
  startIso: string;
  endIso: string;
};

const ACCENT = "5D1C6A"; // shared plum accent

export default function ClientCall({
  sessionId,
  prejoin,
}: {
  sessionId: string;
  prejoin: PrejoinInfo;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [dailyUrl, setDailyUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [videoOff, setVideoOff] = useState<boolean>(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Prepare the call: join as participant, fetch a meeting token, build URL.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setPhase("loading");
      setError(null);
      try {
        const resJoin = await fetch(`/api/sessions/${sessionId}/join`, {
          method: "POST",
        });
        if (!resJoin.ok && resJoin.status !== 409) {
          const data = await resJoin.json().catch(() => ({}));
          throw new Error(data.error || "Failed to join session");
        }

        const resInfo = await fetch(`/api/sessions/${sessionId}`);
        const info = await resInfo.json().catch(() => ({}));
        const youQuiet: boolean = Boolean(info?.youQuiet);
        if (cancelled) return;
        if (youQuiet) {
          setMuted(true);
          setVideoOff(true);
        }

        const tokenRes = await fetch(`/api/sessions/${sessionId}/daily/token`, {
          method: "POST",
        });
        if (!tokenRes.ok) {
          const data = await tokenRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to initialize call");
        }

        const tokenData = (await tokenRes.json()) as {
          domain?: string;
          roomName?: string;
          token?: string;
        };
        if (!tokenData.domain || !tokenData.roomName || !tokenData.token) {
          throw new Error("Invalid call configuration");
        }
        if (cancelled) return;

        const query = new URLSearchParams({
          t: tokenData.token,
          prejoin: "false",
          theme: isDark ? "dark" : "light",
          accent: ACCENT,
        });
        if (youQuiet) {
          query.set("startAudioOff", "true");
          query.set("startVideoOff", "true");
        }

        const url = `https://${tokenData.domain}/${tokenData.roomName}?${query.toString()}`;
        setDailyUrl(url);
        setPhase("ready");
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setPhase("error");
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [sessionId, isDark]);

  // Listen for events emitted by the Daily prebuilt iframe so we can react
  // to a graceful exit and show our own end-screen instead of leaving the
  // user stranded in a blank iframe.
  useEffect(() => {
    if (phase !== "in-call") return;
    const handler = (event: MessageEvent) => {
      const data = event?.data;
      if (!data || typeof data !== "object") return;
      const action = (data as { action?: string }).action;
      if (action === "left-meeting") {
        setPhase("ended");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [phase]);

  const startCall = useCallback(() => {
    setPhase("in-call");
  }, []);

  const sendDailyMessage = useCallback((message: Record<string, unknown>) => {
    const frame = iframeRef.current;
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ ...message, what: "iframe-call-message" }, "*");
    } catch {
      // ignore
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      sendDailyMessage({ action: "set-audio", state: !next });
      return next;
    });
  }, [sendDailyMessage]);

  const toggleVideo = useCallback(() => {
    setVideoOff((prev) => {
      const next = !prev;
      sendDailyMessage({ action: "set-video", state: !next });
      return next;
    });
  }, [sendDailyMessage]);

  const leaveCall = useCallback(() => {
    sendDailyMessage({ action: "leave" });
    setPhase("ended");
  }, [sendDailyMessage]);

  const startsAt = useMemo(
    () =>
      new Date(prejoin.startIso).toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }),
    [prejoin.startIso],
  );

  if (phase === "loading") {
    return (
      <CenteredCard>
        <Spinner />
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Preparing your session
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Connecting you to the call…
        </p>
      </CenteredCard>
    );
  }

  if (phase === "error") {
    return (
      <CenteredCard>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M5 19h14a2 2 0 001.732-3L13.732 4a2 2 0 00-3.464 0L3.268 16A2 2 0 005 19z" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Couldn&rsquo;t start the call
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {error ?? "Something went wrong. Please try again."}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-md bg-[#5D1C6A] px-4 py-2 text-sm font-medium text-white hover:bg-[#CA5995]"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back to dashboard
          </Link>
        </div>
      </CenteredCard>
    );
  }

  if (phase === "ended") {
    return (
      <CenteredCard>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1D3] text-[#5D1C6A] dark:bg-[#5D1C6A]/30 dark:text-[#CA5995]">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          You&rsquo;ve left the session
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {prejoin.partnerName
            ? `Hope your time with ${prejoin.partnerName} was productive.`
            : "Hope you got some focused work done."}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-[#5D1C6A] px-4 py-2 text-sm font-medium text-white hover:bg-[#CA5995]"
          >
            Back to dashboard
          </Link>
          <Link
            href="/sessions"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            My sessions
          </Link>
        </div>
      </CenteredCard>
    );
  }

  if (phase === "ready") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#FFF1D3]/50 via-white to-slate-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#5D1C6A] dark:text-[#CA5995]">
                  Refocus session
                </p>
                <h1 className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {prejoin.sessionName || `${prejoin.sessionType} · ${prejoin.durationMin} min`}
                </h1>
              </div>
              <Link
                href="/dashboard"
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ← Dashboard
              </Link>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                When
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                {startsAt} IST · {prejoin.durationMin} min
              </p>
            </div>

            {prejoin.partnerName && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5D1C6A] text-sm font-semibold text-white">
                  {prejoin.partnerInitial ?? prejoin.partnerName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {prejoin.partnerName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your session partner
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  muted
                    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {muted ? "🔇 Mic off" : "🎙 Mic on"}
              </button>
              <button
                type="button"
                onClick={() => setVideoOff((v) => !v)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  videoOff
                    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {videoOff ? "📷 Camera off" : "🎥 Camera on"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              You can change these anytime inside the call.
            </p>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/40">
            <button
              type="button"
              onClick={startCall}
              className="w-full rounded-lg bg-[#5D1C6A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#CA5995] focus:outline-none focus:ring-2 focus:ring-[#CA5995] focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Join session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // phase === "in-call"
  if (!dailyUrl) return null;
  // Build the URL with the latest mute/video state so the iframe joins
  // exactly the way the user configured on the pre-join screen.
  const iframeUrl = (() => {
    try {
      const u = new URL(dailyUrl);
      if (muted) {
        u.searchParams.set("startAudioOff", "true");
      } else {
        u.searchParams.delete("startAudioOff");
      }
      if (videoOff) {
        u.searchParams.set("startVideoOff", "true");
      } else {
        u.searchParams.delete("startVideoOff");
      }
      return u.toString();
    } catch {
      return dailyUrl;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-2.5 text-white backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#CA5995]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {prejoin.sessionName || `${prejoin.sessionType} session`}
              {prejoin.partnerName ? ` · with ${prejoin.partnerName}` : ""}
            </p>
            <p className="text-[11px] text-slate-300">
              Refocus · {prejoin.durationMin} min
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowLeaveConfirm(true)}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Leave session
        </button>
      </div>

      <iframe
        ref={iframeRef}
        src={iframeUrl}
        allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *; clipboard-read *; clipboard-write *"
        title="Refocus session"
        className="flex-1 w-full border-0"
      />

      {showLeaveConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
            <h2 className="text-lg font-semibold">Leave this session?</h2>
            <p className="mt-1 text-sm text-slate-300">
              You can rejoin from your dashboard while the session is still in
              progress.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  leaveCall();
                }}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* helper hooks for the parent to wire up if ever needed */}
      <span hidden onClick={toggleMute} onContextMenu={toggleVideo} />
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#FFF1D3]/50 via-white to-slate-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#5D1C6A] dark:border-slate-700 dark:border-t-[#CA5995]" />
  );
}
