"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
const CONFETTI_COLORS = [
  "#5D1C6A",
  "#CA5995",
  "#FFD8E8",
  "#FFF1D3",
  "#FFD166",
  "#06D6A0",
  "#118AB2",
];
// If the user leaves within this many ms of the official end, we treat the
// session as completed and celebrate.
const COMPLETION_GRACE_MS = 60_000;

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

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
  const prefersReducedMotion = useReducedMotion() ?? false;

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [dailyUrl, setDailyUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [videoOff, setVideoOff] = useState<boolean>(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);

  const endMs = useMemo(() => new Date(prejoin.endIso).getTime(), [prejoin.endIso]);
  const startMs = useMemo(() => new Date(prejoin.startIso).getTime(), [prejoin.startIso]);
  const totalMs = Math.max(1, endMs - startMs);

  const [remainingMs, setRemainingMs] = useState<number>(() =>
    Math.max(0, endMs - Date.now()),
  );
  const [completedNaturally, setCompletedNaturally] = useState<boolean>(false);
  const [showTimesUp, setShowTimesUp] = useState<boolean>(false);
  const timesUpAcknowledgedRef = useRef<boolean>(false);
  const attendanceReportedRef = useRef<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const reportAttendance = useCallback(() => {
    if (attendanceReportedRef.current) return;
    attendanceReportedRef.current = true;
    // keepalive lets the request survive a navigation/unload so completion
    // gets recorded even when the user closes the tab right after leaving.
    fetch(`/api/sessions/${sessionId}/attendance`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      // Best-effort. Server validates completion against end_time, so we
      // don't need a retry path here.
      attendanceReportedRef.current = false;
    });
  }, [sessionId]);

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
        if (endMs - Date.now() < COMPLETION_GRACE_MS) {
          setCompletedNaturally(true);
        }
        reportAttendance();
        setPhase("ended");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [phase, endMs, reportAttendance]);

  // Drive the in-call countdown. Re-computing from the wall clock each tick
  // keeps the timer honest if the tab is throttled while backgrounded.
  useEffect(() => {
    if (phase !== "in-call") return;
    const tick = () => {
      const remaining = Math.max(0, endMs - Date.now());
      setRemainingMs(remaining);
      if (remaining === 0 && !timesUpAcknowledgedRef.current) {
        setCompletedNaturally(true);
        setShowTimesUp(true);
        // Record completion now — even if the user lingers on the call,
        // they've earned the credit.
        reportAttendance();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, endMs, reportAttendance]);

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
    if (endMs - Date.now() < COMPLETION_GRACE_MS) {
      setCompletedNaturally(true);
    }
    reportAttendance();
    sendDailyMessage({ action: "leave" });
    setPhase("ended");
  }, [endMs, reportAttendance, sendDailyMessage]);

  const urgency: "normal" | "warning" | "critical" =
    remainingMs <= 60_000
      ? "critical"
      : remainingMs <= 5 * 60_000
        ? "warning"
        : "normal";

  const elapsedRatio = useMemo(() => {
    if (phase !== "in-call") return 0;
    const elapsed = totalMs - remainingMs;
    return Math.max(0, Math.min(1, elapsed / totalMs));
  }, [phase, totalMs, remainingMs]);

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
        {completedNaturally && (
          <Confetti active reducedMotion={prefersReducedMotion} burst="top" />
        )}
        {completedNaturally ? (
          <TrophyBadge reducedMotion={prefersReducedMotion} />
        ) : (
          <motion.div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1D3] text-[#5D1C6A] dark:bg-[#5D1C6A]/30 dark:text-[#CA5995]"
            initial={prefersReducedMotion ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        )}
        <motion.h2
          className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100"
          initial={prefersReducedMotion ? false : { y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          {completedNaturally ? "Session complete!" : "You’ve left the session"}
        </motion.h2>
        <motion.p
          className="mt-1 text-sm text-slate-600 dark:text-slate-400"
          initial={prefersReducedMotion ? false : { y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.18, duration: 0.3 }}
        >
          {completedNaturally
            ? prejoin.partnerName
              ? `${prejoin.durationMin} focused minutes with ${prejoin.partnerName}. Nicely done.`
              : `${prejoin.durationMin} focused minutes done. Take a breath.`
            : prejoin.partnerName
              ? `Hope your time with ${prejoin.partnerName} was productive.`
              : "Hope you got some focused work done."}
        </motion.p>
        <motion.div
          className="mt-5 flex justify-center gap-3"
          initial={prefersReducedMotion ? false : { y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.26, duration: 0.3 }}
        >
          <Link
            href="/dashboard"
            className="rounded-md bg-[#5D1C6A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#CA5995]"
          >
            Back to dashboard
          </Link>
          <Link
            href="/sessions"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            My sessions
          </Link>
        </motion.div>
      </CenteredCard>
    );
  }

  if (phase === "ready") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#FFF1D3]/50 via-white to-slate-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
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
              <motion.button
                type="button"
                onClick={() => setMuted((m) => !m)}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  muted
                    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={muted ? "mic-off" : "mic-on"}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="inline-block"
                  >
                    {muted ? "🔇 Mic off" : "🎙 Mic on"}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setVideoOff((v) => !v)}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  videoOff
                    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={videoOff ? "cam-off" : "cam-on"}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="inline-block"
                  >
                    {videoOff ? "📷 Camera off" : "🎥 Camera on"}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              You can change these anytime inside the call.
            </p>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/40">
            <motion.button
              type="button"
              onClick={startCall}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
              className="w-full rounded-lg bg-[#5D1C6A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#CA5995] focus:outline-none focus:ring-2 focus:ring-[#CA5995] focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Join session
            </motion.button>
          </div>
        </motion.div>
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
      <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-4 py-2.5 text-white backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-[#CA5995] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#CA5995]" />
          </span>
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
        <TimerPill
          remainingMs={remainingMs}
          urgency={urgency}
          reducedMotion={prefersReducedMotion}
        />
        <button
          type="button"
          onClick={() => setShowLeaveConfirm(true)}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
        >
          Leave session
        </button>
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 origin-left bg-gradient-to-r from-[#5D1C6A] via-[#CA5995] to-[#FFD166]"
          animate={{ scaleX: elapsedRatio }}
          initial={{ scaleX: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: "linear" }}
          style={{ width: "100%" }}
        />
      </div>

      <iframe
        ref={iframeRef}
        src={iframeUrl}
        allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *; clipboard-read *; clipboard-write *"
        title="Refocus session"
        className="flex-1 w-full border-0"
      />

      <AnimatePresence>
        {showTimesUp && (
          <motion.div
            key="times-up"
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
          >
            <Confetti active reducedMotion={prefersReducedMotion} burst="center" />
            <motion.div
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#5D1C6A]/30 bg-gradient-to-br from-white via-[#FFF7E6] to-[#FFE2EF] p-6 text-center shadow-2xl dark:from-slate-900 dark:via-slate-900 dark:to-slate-950"
              initial={{ scale: prefersReducedMotion ? 1 : 0.85, opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: prefersReducedMotion ? 1 : 0.95, opacity: 0 }}
              transition={{
                type: prefersReducedMotion ? "tween" : "spring",
                stiffness: 280,
                damping: 22,
              }}
            >
              <TrophyBadge reducedMotion={prefersReducedMotion} />
              <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
                Session complete!
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {prejoin.partnerName
                  ? `Nice work with ${prejoin.partnerName}. That was ${prejoin.durationMin} focused minutes.`
                  : `That was ${prejoin.durationMin} focused minutes. Nicely done.`}
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => {
                    timesUpAcknowledgedRef.current = true;
                    setShowTimesUp(false);
                    leaveCall();
                  }}
                  className="rounded-lg bg-[#5D1C6A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#CA5995]"
                >
                  Wrap up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    timesUpAcknowledgedRef.current = true;
                    setShowTimesUp(false);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Keep chatting
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            key="leave-confirm"
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl"
              initial={prefersReducedMotion ? false : { scale: 0.95, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { scale: 0.97, y: 4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            >
              <h2 className="text-lg font-semibold">Leave this session?</h2>
              <p className="mt-1 text-sm text-slate-300">
                You can rejoin from your dashboard while the session is still in
                progress.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveConfirm(false);
                    leaveCall();
                  }}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* helper hooks for the parent to wire up if ever needed */}
      <span hidden onClick={toggleMute} onContextMenu={toggleVideo} />
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#FFF1D3]/50 via-white to-slate-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="relative w-full max-w-md overflow-visible rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900">
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

function TimerPill({
  remainingMs,
  urgency,
  reducedMotion,
}: {
  remainingMs: number;
  urgency: "normal" | "warning" | "critical";
  reducedMotion: boolean;
}) {
  const isOver = remainingMs <= 0;
  const palette = isOver
    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
    : urgency === "critical"
      ? "border-red-400/50 bg-red-500/15 text-red-100"
      : urgency === "warning"
        ? "border-amber-400/50 bg-amber-500/15 text-amber-100"
        : "border-white/15 bg-white/5 text-slate-100";
  const label = isOver
    ? "Time’s up"
    : urgency === "critical"
      ? "Wrapping up"
      : urgency === "warning"
        ? "Final stretch"
        : "Time left";
  const shouldPulse = !reducedMotion && (urgency === "critical" || isOver);

  return (
    <motion.div
      role="timer"
      aria-live="polite"
      aria-label={
        isOver
          ? "Session time is up"
          : `${Math.ceil(remainingMs / 60000)} minutes remaining`
      }
      animate={
        shouldPulse
          ? { scale: [1, 1.04, 1], opacity: [0.95, 1, 0.95] }
          : { scale: 1, opacity: 1 }
      }
      transition={
        shouldPulse
          ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.2 }
      }
      className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium backdrop-blur-sm sm:flex ${palette}`}
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="uppercase tracking-wide opacity-80">{label}</span>
      <span className="font-mono text-sm tabular-nums tracking-tight">
        {isOver ? "00:00" : formatRemaining(remainingMs)}
      </span>
    </motion.div>
  );
}

function TrophyBadge({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      className="relative mx-auto flex h-16 w-16 items-center justify-center"
      initial={reducedMotion ? false : { scale: 0.4, rotate: -20, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.05 }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FFD166] via-[#FFB199] to-[#CA5995] opacity-90 blur-md"
      />
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD166] via-[#FFB199] to-[#CA5995] text-white shadow-lg">
        <svg
          className="h-8 w-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 21h8m-4-4v4m-6-13V5h12v3a6 6 0 11-12 0zm12 0h2a3 3 0 010 6h-2m-12-6H4a3 3 0 000 6h2"
          />
        </svg>
      </span>
    </motion.div>
  );
}

type ConfettiBurst = "center" | "top";

function Confetti({
  active,
  reducedMotion,
  burst,
  count = 60,
}: {
  active: boolean;
  reducedMotion: boolean;
  burst: ConfettiBurst;
  count?: number;
}) {
  const pieces = useMemo(() => {
    if (!active || reducedMotion) return [];
    return Array.from({ length: count }).map((_, i) => {
      const angle =
        burst === "center"
          ? Math.random() * Math.PI * 2
          : (Math.random() * Math.PI) / 1.6 - Math.PI / 3.2; // mostly downward
      const distance = 140 + Math.random() * 320;
      const dx = Math.sin(angle) * distance;
      const dy =
        burst === "center"
          ? Math.cos(angle) * distance
          : 220 + Math.cos(angle) * distance * 0.6;
      return {
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 8,
        round: Math.random() > 0.5,
        rotate: (Math.random() - 0.5) * 720,
        dx,
        dy,
        delay: Math.random() * 0.25,
        duration: 1.4 + Math.random() * 1.4,
      };
    });
  }, [active, reducedMotion, burst, count]);

  if (!active || reducedMotion) return null;

  const originClass =
    burst === "center"
      ? "left-1/2 top-1/2"
      : "left-1/2 top-12"; // burst from above the card title

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className={`absolute ${originClass}`}
          style={{
            width: p.size,
            height: p.size * 1.3,
            background: p.color,
            borderRadius: p.round ? "50%" : "2px",
            marginLeft: -p.size / 2,
            marginTop: -(p.size * 1.3) / 2,
          }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: [0, p.dx * 0.6, p.dx],
            y: [0, p.dy * 0.3 - 30, p.dy],
            rotate: [0, p.rotate * 0.5, p.rotate],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
            times: [0, 0.55, 1],
          }}
        />
      ))}
    </div>
  );
}
