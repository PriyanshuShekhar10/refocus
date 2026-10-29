"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ListChecks, Menu, MessageCircle, Sparkle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ReportDialog from "@/app/(product)/components/ReportDialog";
import MediaPermissionHelp, {
  type DailyDeviceError,
} from "@/app/(product)/components/MediaPermissionHelp";
import { WRAP_UP_MINUTES } from "@/lib/sessionWindow";
import { playSessionCompleteSound, unlockSessionCompleteSound } from "@/lib/sessionCompleteSound";
import { releaseAllLocalMediaStreams } from "@/lib/localMedia";
import { ensureAblyAccess, getAblyClient } from "@/lib/ably-client";
import { sessionAlertsChannel } from "@/lib/realtimeChannels";
import type { SessionCheerEvent } from "@/types/sessionCheer";
import { useSessionTasks } from "@/hooks/useSessionTasks";
import {
  SessionTaskPill,
  SessionTaskRail,
  SessionTaskSheet,
} from "./SessionTaskRail";
import { PreparingSessionShell } from "./PreparingSessionShell";
import { VideoStage, type VideoJoin, type VideoStageHandle } from "./video/VideoStage";

type Phase = "loading" | "in-call" | "ended" | "error";

const JOIN_RETRY_DELAYS_MS = [400, 1000, 2000];

// Join-flow fetches occasionally fail with a transient network error (not a
// real 4xx from the server) — users were having to manually hit "Try again"
// 5-6 times. Retry those automatically before surfacing an error.
async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= JOIN_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status < 500) return res;
      lastError = new Error(`Server error: ${res.status}`);
    } catch (e) {
      lastError = e;
    }
    if (attempt < JOIN_RETRY_DELAYS_MS.length) {
      await new Promise((resolve) => setTimeout(resolve, JOIN_RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastError;
}

type PrejoinInfo = {
  partnerName: string | null;
  partnerInitial: string | null;
  partnerAvatarUrl?: string | null;
  partnerUserId?: string | null;
  durationMin: number;
  sessionType: string;
  sessionName: string | null;
  startIso: string;
  endIso: string;
};

type SessionPartner = {
  userId: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
};

function partnerFromPrejoin(prejoin: PrejoinInfo): SessionPartner | null {
  if (!prejoin.partnerUserId) return null;
  return {
    userId: prejoin.partnerUserId,
    name: prejoin.partnerName,
    username: null,
    avatarUrl: prejoin.partnerAvatarUrl ?? null,
  };
}

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
const WRAP_UP_MS = WRAP_UP_MINUTES * 60_000;
const COMPLETE_BANNER_MS = 10_000;
const CHEER_BURST_MS = 3_200;

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
  currentUserId,
  prejoin,
}: {
  sessionId: string;
  currentUserId: string;
  prejoin: PrejoinInfo;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const prefersReducedMotion = useReducedMotion() ?? false;

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [join, setJoin] = useState<VideoJoin | null>(null);
  const [startMuted, setStartMuted] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [deviceError, setDeviceError] = useState<DailyDeviceError | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [cheerBurstId, setCheerBurstId] = useState(0);
  const [cheerToast, setCheerToast] = useState<string | null>(null);
  const [cheerSending, setCheerSending] = useState(false);
  const sessionTasks = useSessionTasks(sessionId, currentUserId);
  const [partner, setPartner] = useState<SessionPartner | null>(() =>
    partnerFromPrejoin(prejoin),
  );

  const partnerDisplayName =
    partner?.name ?? prejoin.partnerName ?? "session partner";

  const endMs = useMemo(() => new Date(prejoin.endIso).getTime(), [prejoin.endIso]);
  const startMs = useMemo(() => new Date(prejoin.startIso).getTime(), [prejoin.startIso]);
  const totalMs = Math.max(1, endMs - startMs);

  const [remainingMs, setRemainingMs] = useState<number>(() =>
    Math.max(0, endMs - Date.now()),
  );
  const [wrapUpRemainingMs, setWrapUpRemainingMs] = useState<number>(() =>
    Math.max(0, endMs + WRAP_UP_MS - Date.now()),
  );
  const [completedNaturally, setCompletedNaturally] = useState<boolean>(false);
  const [wrapUpBanner, setWrapUpBanner] = useState<"complete" | "ending" | null>(
    null,
  );
  const timesUpAcknowledgedRef = useRef<boolean>(false);
  const wrapUpEndingShownRef = useRef<boolean>(false);
  const completeSoundPlayedRef = useRef<boolean>(false);
  const attendanceReportedRef = useRef<boolean>(false);
  const stageRef = useRef<VideoStageHandle | null>(null);
  const deviceHelpDismissedRef = useRef(false);

  const showDeviceError = useCallback((error: DailyDeviceError) => {
    if (deviceHelpDismissedRef.current) return;
    setDeviceError(error);
  }, []);

  const dismissDeviceHelp = useCallback(() => {
    deviceHelpDismissedRef.current = true;
    setDeviceError(null);
  }, []);

  // Session page mounts without the dashboard sidebar — release any streams
  // the device test may still hold from the previous page during navigation.
  useEffect(() => {
    releaseAllLocalMediaStreams();
  }, []);

  // Warm the Stream Video SDK chunk in parallel with the join/token round
  // trip below, instead of waiting for StreamStage to mount before starting
  // the download. Stream is the default provider, so this pays off on
  // nearly every call; on a rare Daily session it's a small wasted fetch.
  // Dynamic import() is deduped by specifier, so StreamStage's own import
  // of the same module later resolves instantly from this warm cache.
  useEffect(() => {
    void import("@stream-io/video-react-sdk");
  }, []);

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

  // Prepare the call: join as participant, then get join details for the video provider.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setPhase("loading");
      setError(null);
      try {
        const resJoin = await fetchWithRetry(`/api/sessions/${sessionId}/join`, {
          method: "POST",
        });
        if (!resJoin.ok && resJoin.status !== 409) {
          const data = await resJoin.json().catch(() => ({}));
          throw new Error(data.error || "Failed to join session");
        }

        // Independent of each other once joined — fetch in parallel instead
        // of serially to shave a full round trip off time-to-video.
        const [resInfo, tokenRes] = await Promise.all([
          fetchWithRetry(`/api/sessions/${sessionId}`),
          fetchWithRetry(`/api/sessions/${sessionId}/video/token`, { method: "POST" }),
        ]);
        const info = await resInfo.json().catch(() => ({}));
        const youQuiet: boolean = Boolean(info?.youQuiet);
        if (info?.partner) {
          setPartner(info.partner as SessionPartner);
        }
        if (cancelled) return;
        if (youQuiet) {
          // Quiet / focus mode mutes mic only — cameras stay on for presence.
          setMuted(true);
        }

        if (!tokenRes.ok) {
          const data = await tokenRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to initialize call");
        }

        const tokenData = (await tokenRes.json()) as Partial<VideoJoin>;
        if (
          (tokenData.provider !== "daily" && tokenData.provider !== "stream") ||
          !tokenData.domain ||
          !tokenData.roomName ||
          !tokenData.token
        ) {
          throw new Error("Invalid call configuration");
        }
        if (cancelled) return;

        unlockSessionCompleteSound();
        deviceHelpDismissedRef.current = false;
        setStartMuted(youQuiet);
        setJoin(tokenData as VideoJoin);
        setDeviceError(null);
        setPhase("in-call");
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
  }, [sessionId]);

  const handleLeftMeeting = useCallback(() => {
    if (endMs - Date.now() < COMPLETION_GRACE_MS) {
      setCompletedNaturally(true);
      if (!completeSoundPlayedRef.current) {
        completeSoundPlayedRef.current = true;
        playSessionCompleteSound();
      }
    }
    reportAttendance();
    setPhase("ended");
  }, [endMs, reportAttendance]);

  const handleCameraStarted = useCallback(() => {
    deviceHelpDismissedRef.current = false;
    setDeviceError(null);
  }, []);

  // Stream's native CallControls mic button changes the real device state
  // directly (bypassing toggleMute), which used to leave `muted` stale for
  // the wrap-up banner's "Unmute to say goodbye" logic. StreamStage reports
  // the actual mic state here regardless of which control changed it.
  const handleMicStateChange = useCallback((enabled: boolean) => {
    setMuted(!enabled);
  }, []);

  // The SFU join itself (not just a device-permission error) can fail —
  // reuse the same "Couldn't start the call" screen the initial join/token
  // fetch already shows, rather than leaving a frozen blank call screen.
  const handleJoinFailed = useCallback((message?: string) => {
    setError(message ?? "Couldn't connect to the call. Please try again.");
    setPhase("error");
  }, []);

  // Keep partner info in sync when the other participant joins mid-wait.
  // Stops once a partner is known — there's nothing left to reconcile for
  // the rest of the call.
  useEffect(() => {
    if (phase !== "in-call" || partner) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const syncPartner = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok || cancelled) return;
        const info = await res.json();
        if (info?.partner) {
          setPartner(info.partner as SessionPartner);
          if (interval) clearInterval(interval);
        }
      } catch {
        // ignore
      }
    };

    syncPartner();
    interval = setInterval(syncPartner, 15_000);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [phase, sessionId, partner]);

  // Drive the in-call countdown. Re-computing from the wall clock each tick
  // keeps the timer honest if the tab is throttled while backgrounded.
  useEffect(() => {
    if (phase !== "in-call") return;
    const tick = () => {
      const remaining = Math.max(0, endMs - Date.now());
      const wrapRemaining = Math.max(0, endMs + WRAP_UP_MS - Date.now());
      setRemainingMs(remaining);
      setWrapUpRemainingMs(wrapRemaining);
      if (remaining === 0 && !timesUpAcknowledgedRef.current) {
        timesUpAcknowledgedRef.current = true;
        setCompletedNaturally(true);
        setWrapUpBanner("complete");
        reportAttendance();
        if (!completeSoundPlayedRef.current) {
          completeSoundPlayedRef.current = true;
          playSessionCompleteSound();
        }
      }
      if (
        remaining === 0 &&
        wrapRemaining === 0 &&
        !wrapUpEndingShownRef.current
      ) {
        wrapUpEndingShownRef.current = true;
        setWrapUpBanner("ending");
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, endMs, reportAttendance]);

  useEffect(() => {
    if (wrapUpBanner !== "complete") return;
    const timeout = window.setTimeout(() => {
      setWrapUpBanner((current) => (current === "complete" ? null : current));
    }, COMPLETE_BANNER_MS);
    return () => window.clearTimeout(timeout);
  }, [wrapUpBanner]);

  // Partner cheer / alert via Ably (sound + confetti on the receiving side).
  useEffect(() => {
    if (phase !== "in-call") return;
    let channel: ReturnType<ReturnType<typeof getAblyClient>["channels"]["get"]> | null =
      null;
    try {
      const client = getAblyClient();
      channel = client.channels.get(sessionAlertsChannel(sessionId));
      const onEvent = (message: { data?: unknown }) => {
        const data = message.data as SessionCheerEvent | undefined;
        if (data?.type !== "session_cheer") return;
        if (data.sessionId !== sessionId) return;
        unlockSessionCompleteSound();
        playSessionCompleteSound();
        setCheerBurstId((n) => n + 1);
        if (data.fromUserId === currentUserId) {
          setCheerToast(
            partner
              ? `Cheer sent to ${partnerDisplayName}`
              : "Cheer sent",
          );
        } else {
          setCheerToast(
            partnerDisplayName
              ? `${partnerDisplayName} sent a cheer`
              : "Partner sent a cheer",
          );
        }
      };
      let cancelled = false;
      const ch = channel;
      void ensureAblyAccess(sessionAlertsChannel(sessionId)).then(() => {
        if (!cancelled) ch.subscribe("event", onEvent);
      });
      return () => {
        cancelled = true;
        try {
          channel?.unsubscribe("event", onEvent);
        } catch {
          // ignore
        }
      };
    } catch {
      return undefined;
    }
  }, [phase, sessionId, currentUserId, partnerDisplayName, partner]);

  useEffect(() => {
    if (cheerBurstId === 0) return;
    const t = window.setTimeout(() => setCheerBurstId(0), CHEER_BURST_MS);
    return () => window.clearTimeout(t);
  }, [cheerBurstId]);

  useEffect(() => {
    if (!cheerToast) return;
    const t = window.setTimeout(() => setCheerToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [cheerToast]);

  const sendCheer = useCallback(async () => {
    if (cheerSending) return;
    unlockSessionCompleteSound();
    setCheerSending(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/alert`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCheerToast(
          typeof data.error === "string" ? data.error : "Couldn’t send cheer",
        );
        return;
      }
      // Sound + confetti also arrive via Ably for both sides (including sender).
    } catch {
      setCheerToast("Couldn’t send cheer");
    } finally {
      setCheerSending(false);
    }
  }, [cheerSending, sessionId]);

  const toggleMute = useCallback(() => {
    unlockSessionCompleteSound();
    setMuted((prev) => {
      const next = !prev;
      stageRef.current?.setMicEnabled(!next);
      return next;
    });
  }, []);

  const leaveCall = useCallback(() => {
    unlockSessionCompleteSound();
    if (endMs - Date.now() < COMPLETION_GRACE_MS) {
      setCompletedNaturally(true);
      if (!completeSoundPlayedRef.current) {
        completeSoundPlayedRef.current = true;
        playSessionCompleteSound();
      }
    }
    reportAttendance();
    stageRef.current?.leave();
    setPhase("ended");
  }, [endMs, reportAttendance]);

  const retryDeviceSetup = useCallback(async () => {
    deviceHelpDismissedRef.current = false;
    setDeviceError(null);
    await stageRef.current?.retryCamera();
  }, []);

  const inWrapUp = remainingMs === 0 && wrapUpRemainingMs > 0;
  const urgency: "normal" | "warning" | "critical" =
    inWrapUp
      ? wrapUpRemainingMs <= 60_000
        ? "critical"
        : "warning"
      : remainingMs <= 60_000
        ? "critical"
        : remainingMs <= 5 * 60_000
          ? "warning"
          : "normal";

  const elapsedRatio = useMemo(() => {
    if (phase !== "in-call") return 0;
    const elapsed = totalMs - remainingMs;
    return Math.max(0, Math.min(1, elapsed / totalMs));
  }, [phase, totalMs, remainingMs]);

  if (phase === "loading") {
    return <PreparingSessionShell />;
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
            ? partnerDisplayName && partner
              ? `${prejoin.durationMin} focused minutes with ${partnerDisplayName}. Nicely done.`
              : `${prejoin.durationMin} focused minutes done. Take a breath.`
            : partnerDisplayName && partner
              ? `Hope your time with ${partnerDisplayName} was productive.`
              : "Hope you got some focused work done."}
        </motion.p>
        <motion.div
          className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row"
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
          {partner ? (
            <button
              type="button"
              onClick={() => setShowReportDialog(true)}
              className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Report user
            </button>
          ) : null}
        </motion.div>
        {partner ? (
          <ReportDialog
            open={showReportDialog}
            onClose={() => setShowReportDialog(false)}
            targetType="session_call"
            targetId={sessionId}
            reportedUserId={partner.userId}
            reportedLabel={partnerDisplayName}
            contentPreview={`Session with ${partnerDisplayName}`}
          />
        ) : null}
      </CenteredCard>
    );
  }

  // phase === "in-call"
  if (!join) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0E1015]">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 overflow-hidden border-b border-[#2B303A] bg-[#181B22] px-3 py-2 text-white sm:gap-y-3 sm:px-4 sm:py-3">
        {/* No flex-1/basis here: the title shouldn't compete equally with
            the button group for leftover space — it just needs to shrink
            (min-w-0 + truncate) when the row is tight, not claim a share
            of room the buttons actually need. */}
        <div className="hidden min-w-0 shrink items-center gap-3 sm:flex">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold tracking-tight">
              {prejoin.sessionName || `${prejoin.sessionType} session`}
              {partner ? ` · with ${partnerDisplayName}` : ""}
            </p>
            <p className="text-[11.5px] font-semibold tracking-wide text-[#9AA2B0]">
              Refocus · {prejoin.durationMin} min
            </p>
          </div>
        </div>
        <TimerPill
          remainingMs={remainingMs}
          wrapUpRemainingMs={wrapUpRemainingMs}
          urgency={urgency}
          reducedMotion={prefersReducedMotion}
        />
        <div className="flex flex-1 items-center justify-end gap-2">
          {/* Desktop: Tasks/Chat/Cheer/Report inline. Mobile: collapsed into
              the hamburger menu below — Time left and Leave session are the
              only things that must stay directly visible on a small screen. */}
          <div className="hidden items-center gap-2 sm:flex">
            <SessionTaskPill
              youDone={sessionTasks.youProgress.done}
              youTotal={sessionTasks.youProgress.total}
              partnerDone={sessionTasks.partnerProgress.done}
              partnerTotal={sessionTasks.partnerProgress.total}
              partnerName={partnerDisplayName}
              open={tasksOpen}
              onToggle={() => setTasksOpen((v) => !v)}
            />
            {join?.chat ? (
              <button
                type="button"
                aria-pressed={chatOpen}
                aria-label={chatOpen ? "Hide chat" : "Show chat"}
                onClick={() => setChatOpen((v) => !v)}
                className={`relative inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-b-4 px-3.5 text-[12.5px] font-bold transition-transform active:translate-y-0.5 active:border-b-2 ${
                  chatOpen
                    ? "border-[#3B7DD8] bg-[#1F2E41] text-[#6EA0E1]"
                    : "border-[#343A47] bg-[#181B22] text-[#C3C8D2]"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Chat
                {hasUnreadChat ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#E45858] ring-2 ring-[#0E1015]"
                  />
                ) : null}
              </button>
            ) : null}
            {partner ? (
              <button
                type="button"
                onClick={() => void sendCheer()}
                disabled={cheerSending}
                title="Send a cheer — partner hears a chime and sees confetti"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-b-4 border-[#E0609F] bg-[#411F30] px-3.5 text-[12.5px] font-bold text-[#D878AA] transition-transform active:translate-y-0.5 active:border-b-2 disabled:opacity-60"
              >
                <Sparkle className="h-3.5 w-3.5" aria-hidden="true" />
                Cheer
              </button>
            ) : null}
            {partner ? (
              <button
                type="button"
                onClick={() => setShowReportDialog(true)}
                className="inline-flex h-9 items-center rounded-full border-2 border-b-4 border-[#343A47] bg-[#181B22] px-3.5 text-[12.5px] font-bold text-[#C3C8D2] transition-transform active:translate-y-0.5 active:border-b-2"
              >
                Report
              </button>
            ) : null}
          </div>
          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
              <button
                type="button"
                aria-label="More session options"
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-b-4 border-[#343A47] bg-[#181B22] text-[#C3C8D2] transition-transform active:translate-y-0.5 active:border-b-2 sm:hidden"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                align="end"
                sideOffset={8}
                className="z-50 flex min-w-[180px] flex-col gap-0.5 rounded-xl border border-[#2B303A] bg-[#181B22] p-1.5 text-white shadow-xl"
              >
                <DropdownMenuPrimitive.Item
                  onSelect={() => setTasksOpen((v) => !v)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium outline-none data-[highlighted]:bg-white/10"
                >
                  <ListChecks className="h-4 w-4" aria-hidden="true" />
                  {tasksOpen ? "Hide tasks" : "Show tasks"}
                </DropdownMenuPrimitive.Item>
                {join?.chat ? (
                  <DropdownMenuPrimitive.Item
                    onSelect={() => setChatOpen((v) => !v)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium outline-none data-[highlighted]:bg-white/10"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {chatOpen ? "Hide chat" : "Show chat"}
                    {hasUnreadChat ? (
                      <span
                        aria-hidden="true"
                        className="ml-auto h-2 w-2 rounded-full bg-[#E45858]"
                      />
                    ) : null}
                  </DropdownMenuPrimitive.Item>
                ) : null}
                {partner ? (
                  <DropdownMenuPrimitive.Item
                    onSelect={() => void sendCheer()}
                    disabled={cheerSending}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#D878AA] outline-none data-[disabled]:opacity-60 data-[highlighted]:bg-white/10"
                  >
                    <Sparkle className="h-4 w-4" aria-hidden="true" />
                    Cheer
                  </DropdownMenuPrimitive.Item>
                ) : null}
                {partner ? (
                  <DropdownMenuPrimitive.Item
                    onSelect={() => setShowReportDialog(true)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium outline-none data-[highlighted]:bg-white/10"
                  >
                    Report
                  </DropdownMenuPrimitive.Item>
                ) : null}
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
          <button
            type="button"
            onClick={() => setShowLeaveConfirm(true)}
            className="inline-flex h-9 items-center rounded-full bg-[#E45858] px-4 text-[12.5px] font-extrabold text-white shadow-[0_3px_0_#9c3434] transition-transform active:translate-y-[3px] active:shadow-none"
          >
            Leave session
          </button>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-[#262A34]">
          <motion.div
            aria-hidden
            className="h-full origin-left rounded-r-[3px] bg-gradient-to-r from-[#5D1C6A] via-[#CA5995] to-[#FFD166]"
            animate={{ scaleX: elapsedRatio }}
            initial={{ scaleX: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: "linear" }}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0 p-0 sm:gap-4 sm:p-4">
        <div className="relative flex min-h-0 flex-1 gap-4">
          <div className="relative flex min-h-0 flex-1 sm:rounded-2xl sm:border sm:border-[#2B303A] sm:bg-[#181B22] sm:p-4">
            <VideoStage
              ref={stageRef}
              join={join}
              userId={currentUserId}
              sessionId={sessionId}
              startMuted={startMuted}
              isDark={isDark}
              chatOpen={chatOpen}
              onCloseChat={() => setChatOpen(false)}
              onLeft={handleLeftMeeting}
              onDeviceError={showDeviceError}
              onCameraStarted={handleCameraStarted}
              onMicStateChange={handleMicStateChange}
              onJoinFailed={handleJoinFailed}
              onUnreadChatChange={setHasUnreadChat}
            />
            {deviceError ? (
              <MediaPermissionHelp
                error={deviceError}
                onTryAgain={retryDeviceSetup}
                onDismiss={dismissDeviceHelp}
              />
            ) : null}
            {cheerBurstId > 0 ? (
              <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
                <Confetti
                  key={cheerBurstId}
                  active
                  reducedMotion={prefersReducedMotion}
                  burst="center"
                  count={72}
                />
              </div>
            ) : null}
            <AnimatePresence>
              {cheerToast ? (
                <motion.div
                  key={cheerToast}
                  className="pointer-events-none absolute inset-x-0 top-4 z-40 flex justify-center px-4"
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -6 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                >
                  <div className="rounded-full border border-white/20 bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
                    {cheerToast}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {tasksOpen ? (
              <SessionTaskSheet
                tasks={sessionTasks}
                partnerName={partnerDisplayName}
                onClose={() => setTasksOpen(false)}
              />
            ) : null}
          </div>
          {tasksOpen ? (
            <SessionTaskRail
              tasks={sessionTasks}
              partnerName={partnerDisplayName}
              onClose={() => setTasksOpen(false)}
            />
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {wrapUpBanner && (
          <motion.div
            key={wrapUpBanner}
            className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-4"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -6 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
          >
            <div className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl border border-[#5D1C6A]/25 bg-white/95 p-4 text-center shadow-2xl backdrop-blur-md dark:border-[#CA5995]/30 dark:bg-slate-900/95">
              {wrapUpBanner === "complete" ? (
                <>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Session complete — {WRAP_UP_MINUTES} minutes to say goodbye
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {partner
                      ? `Stay on with ${partnerDisplayName} to wrap up. The call stays open.`
                      : "The call stays open for a short wrap-up."}
                    {muted ? " Unmute if you want to check in." : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {muted ? (
                      <button
                        type="button"
                        onClick={() => {
                          toggleMute();
                          setWrapUpBanner(null);
                        }}
                        className="rounded-lg bg-[#5D1C6A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#CA5995]"
                      >
                        Unmute to say goodbye
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setWrapUpBanner(null)}
                        className="rounded-lg bg-[#5D1C6A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#CA5995]"
                      >
                        Stay on the call
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setWrapUpBanner(null);
                        leaveCall();
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Leave
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Wrap-up is over
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Thanks for focusing. You can leave now, or linger a moment more.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setWrapUpBanner(null);
                        leaveCall();
                      }}
                      className="rounded-lg bg-[#5D1C6A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#CA5995]"
                    >
                      Leave session
                    </button>
                    <button
                      type="button"
                      onClick={() => setWrapUpBanner(null)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Stay a bit longer
                    </button>
                  </div>
                </>
              )}
            </div>
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
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                {partner ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLeaveConfirm(false);
                      setShowReportDialog(true);
                    }}
                    className="rounded-md border border-red-400/40 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/10 sm:mr-auto"
                  >
                    Report user
                  </button>
                ) : null}
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

      {partner ? (
        <ReportDialog
          open={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          targetType="session_call"
          targetId={sessionId}
          reportedUserId={partner.userId}
          reportedLabel={partnerDisplayName}
          contentPreview={`Session with ${partnerDisplayName}`}
        />
      ) : null}
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

function TimerPill({
  remainingMs,
  wrapUpRemainingMs,
  urgency,
  reducedMotion,
}: {
  remainingMs: number;
  wrapUpRemainingMs: number;
  urgency: "normal" | "warning" | "critical";
  reducedMotion: boolean;
}) {
  const inWrapUp = remainingMs <= 0 && wrapUpRemainingMs > 0;
  const isOver = remainingMs <= 0 && wrapUpRemainingMs <= 0;
  // Same pill shape/weight as the "Video Call" design's "Time left" chip,
  // with analogous tints for the warning/critical/over states it didn't cover.
  const palette = isOver
    ? { border: "#1F4E3A", bg: "#153A2B", label: "#4ADE80", icon: "#4ADE80" }
    : inWrapUp || urgency === "critical"
      ? { border: "#4E3B1F", bg: "#3A2E15", label: "#F5C563", icon: "#F5C563" }
      : urgency === "warning"
        ? { border: "#4E3B1F", bg: "#3A2E15", label: "#F5C563", icon: "#F5C563" }
        : { border: "#26384E", bg: "#1F2E41", label: "#5A92DE", icon: "#6EA0E1" };
  const label = isOver
    ? "Time’s up"
    : inWrapUp
      ? "Say goodbye"
      : urgency === "critical"
        ? "Wrapping up"
        : urgency === "warning"
          ? "Final stretch"
          : "Time left";
  const displayMs = remainingMs > 0 ? remainingMs : wrapUpRemainingMs;
  const shouldPulse = !reducedMotion && (urgency === "critical" || inWrapUp || isOver);

  return (
    <motion.div
      role="timer"
      aria-live="polite"
      aria-label={
        isOver
          ? "Session time is up"
          : inWrapUp
            ? `${Math.ceil(wrapUpRemainingMs / 60000)} minutes left to say goodbye`
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
      className="flex items-center gap-2.5 rounded-full border px-3.5 py-1.5"
      style={{ borderColor: palette.border, backgroundColor: palette.bg }}
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke={palette.icon}
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span
        className="text-[11px] font-bold uppercase tracking-wide"
        style={{ color: palette.label }}
      >
        {label}
      </span>
      <span className="font-mono text-base tabular-nums tracking-tight text-[#ECEEF3]">
        {isOver ? "00:00" : formatRemaining(displayMs)}
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
