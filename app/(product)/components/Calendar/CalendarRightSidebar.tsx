"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { VerifiedName } from "@/components/verified-tag";
import DeviceTestModal from "../DeviceTestModal";
import SidebarUpdatesBox from "../Updates/SidebarUpdatesBox";
import { releaseAllLocalMediaStreams } from "@/lib/localMedia";
import { AttendanceHighlight } from "@/components/attendance-highlight";
import type { CalendarEvent } from "@/types/calendar";
import { UpNextPanel } from "./UpNextPanel";

function JoinCountdown({ startTime }: { startTime: string | Date }) {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const start = new Date(startTime);
      const diffMs = start.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0 });
        return;
      }

      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      setTimeLeft({ minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  if (!timeLeft) return null;

  if (timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return (
      <p className="text-xs font-medium text-rf-plum-ink">
        Session is live now!
      </p>
    );
  }

  return (
    <p className="text-xs text-rf-plum-ink">
      Session starts in{" "}
      <span className="font-semibold">
        {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    </p>
  );
}

interface CalendarRightSidebarProps {
  sessionCount: number;
  onGoToday: () => void;
  joinableSession?: {
    id: string;
    start: string | Date;
    end?: string | Date;
  } | null;
  profilePreview?: {
    username: string;
    name: string;
    about?: string | null;
    avatarUrl?: string | null;
    emailVerified?: boolean;
    attendance?: { percent: number; booked: number; attended: number } | null;
  } | null;
  onClearProfilePreview?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
  /** Dashboard only: show the Next up / Later cards. */
  showUpNext?: boolean;
  onOpenSession?: (event: CalendarEvent) => void;
}

type DetailedProfile = {
  username: string;
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  avatarUrl: string | null;
  about: string | null;
  interests: string[];
  location: string | null;
  website: string | null;
  createdAt: string | null;
  emailVerified?: boolean;
  attendance?: { percent: number; booked: number; attended: number } | null;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const utilityRowClass =
  "flex min-h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-2 text-left text-[13px] text-rf-ink-soft transition-colors hover:bg-rf-line-soft hover:text-rf-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose";

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-3.5 w-3.5 shrink-0 text-rf-ink-mute"}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function CalendarRightSidebar({
  sessionCount,
  onGoToday: _onGoToday,
  joinableSession,
  profilePreview,
  onClearProfilePreview,
  onCollapseChange,
  showUpNext = false,
  onOpenSession,
}: CalendarRightSidebarProps) {
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [detailedProfile, setDetailedProfile] = useState<DetailedProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [myAttendance, setMyAttendance] = useState<{
    percent: number;
    booked: number;
    attended: number;
  } | null>(null);
  const [deviceTestOpen, setDeviceTestOpen] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fromSession = session?.user?.image?.trim();
    if (fromSession) setMyAvatarUrl(fromSession);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me");
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        const nextAttendance = data?.user?.attendance;
        if (
          nextAttendance &&
          typeof nextAttendance.percent === "number" &&
          typeof nextAttendance.attended === "number"
        ) {
          setMyAttendance(nextAttendance);
          try {
            sessionStorage.setItem(
              "refocus.attendance.me",
              JSON.stringify(nextAttendance),
            );
          } catch {
            // ignore quota / private mode
          }
        }
        if (data?.user?.avatarUrl) {
          setMyAvatarUrl(data.user.avatarUrl);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.image]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("refocus.attendance.me");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        percent?: number;
        booked?: number;
        attended?: number;
      };
      if (
        typeof parsed.percent === "number" &&
        typeof parsed.attended === "number" &&
        (parsed.booked ?? 0) > 0
      ) {
        setMyAttendance({
          percent: parsed.percent,
          booked: parsed.booked ?? parsed.attended,
          attended: parsed.attended,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (profilePreview) {
      setIsCollapsed(false);
    }
  }, [profilePreview]);

  useEffect(() => {
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

  useEffect(() => {
    const username = profilePreview?.username;
    if (!username) {
      setDetailedProfile(null);
      setIsProfileLoading(false);
      setProfileError(null);
      return;
    }

    let cancelled = false;
    setIsProfileLoading(true);
    setProfileError(null);

    (async () => {
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Unable to load profile");
        }
        if (!cancelled) {
          setDetailedProfile((data.user as DetailedProfile) ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setDetailedProfile(null);
          setProfileError((e as Error).message);
        }
      } finally {
        if (!cancelled) {
          setIsProfileLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profilePreview?.username]);

  const user = session?.user as { name?: string; email?: string; image?: string } | undefined;
  const currentAvatarUrl = myAvatarUrl || user?.image || null;
  
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const previewName =
    [
      detailedProfile?.firstname?.trim() || "",
      detailedProfile?.lastname?.trim() || "",
    ]
      .filter(Boolean)
      .join(" ") ||
    detailedProfile?.name ||
    profilePreview?.name ||
    "User";
  const previewInitials = previewName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const previewAvatarUrl = detailedProfile?.avatarUrl || profilePreview?.avatarUrl || null;
  const previewAbout =
    detailedProfile?.about?.trim() ||
    profilePreview?.about?.trim() ||
    "No bio added yet.";
  const joinedDate = detailedProfile?.createdAt
    ? new Date(detailedProfile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;
  const websiteHref = detailedProfile?.website
    ? detailedProfile.website.startsWith("http")
      ? detailedProfile.website
      : `https://${detailedProfile.website}`
    : null;
  const previewAttendance =
    detailedProfile?.attendance ?? profilePreview?.attendance ?? null;

  return (
    <aside
      className={`shrink-0 flex flex-col h-full overflow-hidden transition-[width] duration-300 ease-in-out ${
        isCollapsed ? "w-14" : "w-72"
      }`}
    >
      <div className="relative flex-1 min-h-0 flex flex-col min-w-0">
        {/* Collapsed content */}
        <div
          className={`absolute inset-0 flex flex-col items-center py-2 gap-2 transition-opacity duration-300 ${
            isCollapsed ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2 rounded-lg hover:bg-rf-line-soft transition-colors"
            title="Expand sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rf-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          <Avatar className="h-10 w-10">
            {previewAvatarUrl ? (
              <AvatarImage src={previewAvatarUrl} alt={previewName} />
            ) : currentAvatarUrl ? (
              <AvatarImage src={currentAvatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="text-sm font-semibold bg-rf-cream-bg text-rf-plum-ink">
              {profilePreview
                ? previewInitials
                : initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1" />
          <Link
            href="/profile"
            className="p-2 rounded-lg hover:bg-rf-line-soft transition-colors"
            title="Profile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rf-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
          <button
            onClick={() => mounted && setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-rf-line-soft transition-colors"
            title="Toggle theme"
          >
            {mounted && theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rf-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rf-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-rf-ink-mute hover:text-red-600 transition-colors"
            title="Sign out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Expanded content */}
        <div
          className={`absolute inset-0 flex flex-col gap-3 pb-2 overflow-y-auto transition-opacity duration-300 ${
            !isCollapsed ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
      {/* Collapse */}
      <div className="flex shrink-0 justify-end px-0.5 pt-0.5">
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rf-ink-mute transition-colors hover:bg-rf-line-soft hover:text-rf-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose/35"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <span className="text-sm leading-none" aria-hidden="true">
            ›
          </span>
        </button>
      </div>

      {/* Profile preview OR personal utility panel */}
      {profilePreview ? (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-[14px] border border-rf-line bg-rf-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11.5px] font-semibold tracking-[0.02em] text-rf-ink-mute">
              Profile
            </p>
            <div className="flex items-center gap-1">
              <Link
                href={`/u/${profilePreview.username}`}
                className="rounded p-1 text-rf-ink-mute hover:bg-rf-line-soft hover:text-rf-plum-ink"
                title="Open full profile"
                aria-label="Open full profile"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v3a1 1 0 102 0V5h3a1 1 0 100-2H5zm7 0a1 1 0 100 2h3v3a1 1 0 102 0V5a2 2 0 00-2-2h-3zM3 12a1 1 0 011 1v2h2a1 1 0 110 2H4a2 2 0 01-2-2v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a2 2 0 01-2 2h-2a1 1 0 110-2h2v-2a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </Link>
              {onClearProfilePreview ? (
                <button
                  type="button"
                  onClick={onClearProfilePreview}
                  className="rounded p-1 text-rf-ink-mute hover:bg-rf-line-soft hover:text-rf-ink"
                  title="Close preview"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Avatar className="h-11 w-11">
              {previewAvatarUrl ? (
                <AvatarImage src={previewAvatarUrl} alt={previewName} />
              ) : null}
              <AvatarFallback className="text-sm font-semibold bg-rf-cream-bg text-rf-plum-ink">
                {previewInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-rf-ink">
                <VerifiedName
                  name={previewName}
                  verified={
                    detailedProfile?.emailVerified ??
                    profilePreview.emailVerified
                  }
                />
              </p>
              <p className="truncate text-xs text-rf-ink-mute">
                @{profilePreview.username}
              </p>
            </div>
          </div>

          {previewAttendance ? (
            <div className="mt-3">
              <AttendanceHighlight
                attendance={previewAttendance}
                variant="app"
              />
            </div>
          ) : null}

          <p className="mt-3 line-clamp-4 text-xs leading-relaxed whitespace-pre-wrap text-rf-ink-soft">
            {previewAbout}
          </p>

          {isProfileLoading ? (
            <p className="mt-3 text-xs text-rf-ink-mute">
              Loading profile details...
            </p>
          ) : profileError ? null : (
            <>
              {(detailedProfile?.location || joinedDate || websiteHref) && (
                <div className="mt-3 space-y-1.5 text-[11px] text-rf-ink-soft">
                  {detailedProfile?.location && (
                    <p>Location: {detailedProfile.location}</p>
                  )}
                  {joinedDate && <p>Joined: {joinedDate}</p>}
                  {websiteHref && (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-rf-plum-ink underline hover:text-rf-plum-ink"
                    >
                      {detailedProfile?.website}
                    </a>
                  )}
                </div>
              )}

              {detailedProfile?.interests?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {detailedProfile.interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full border border-rf-line px-2 py-0.5 text-[10px] font-medium text-rf-ink-soft"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="shrink-0 rounded-[14px] border border-rf-line bg-rf-card px-3 pb-2 pt-5">
          <div className="flex flex-col items-center text-center">
            <Avatar className="mb-2.5 h-14 w-14">
              {currentAvatarUrl ? (
                <AvatarImage src={currentAvatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-sm font-semibold bg-rf-cream-bg text-rf-plum-ink">
                {initials}
              </AvatarFallback>
            </Avatar>

            <h2 className="whitespace-nowrap text-[17px] font-semibold leading-[1.3] tracking-[-0.02em] text-rf-ink">
              {getGreeting()}, {firstName}
            </h2>

            <p className="mt-1 whitespace-nowrap text-[14px] text-rf-ink-mute">
              {formatDate()}
            </p>

            <Link
              href="/dashboard?tab=sessions"
              className="mt-2.5 inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-2 text-[13px] font-medium text-rf-success transition-colors hover:bg-rf-success-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 opacity-80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {sessionCount} session{sessionCount !== 1 ? "s" : ""} today
              <ChevronRight className="h-3 w-3" />
            </Link>

            {myAttendance ? (
              <div className="mt-3 w-full min-w-0 self-stretch">
                <AttendanceHighlight attendance={myAttendance} variant="app" />
              </div>
            ) : null}
          </div>

          <div className="mt-3.5 space-y-0.5 border-t border-rf-line-soft pt-1.5">
            <Link href="/profile" className={utilityRowClass}>
              <span className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 text-rf-ink-mute"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                My Profile
              </span>
              <ChevronRight />
            </Link>

            <button
              type="button"
              onClick={() => {
                if (!mounted) return;
                const active = resolvedTheme ?? theme;
                setTheme(active === "dark" ? "light" : "dark");
              }}
              className={utilityRowClass}
              aria-label={`Appearance, currently ${
                mounted && (resolvedTheme ?? theme) === "dark" ? "Dark" : "Light"
              }. Toggle theme.`}
            >
              <span className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 text-rf-ink-mute"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
                Appearance
              </span>
              <span className="flex items-center gap-1 text-[12px] text-rf-ink-mute">
                {mounted
                  ? (resolvedTheme ?? theme) === "dark"
                    ? "Dark"
                    : "Light"
                  : "…"}
                <ChevronRight />
              </span>
            </button>
          </div>
        </div>
      )}

      {showUpNext ? (
        <UpNextPanel
          onOpenSession={onOpenSession}
          onTestDevices={() => setDeviceTestOpen(true)}
          onJoin={() => {
            releaseAllLocalMediaStreams();
            setDeviceTestOpen(false);
          }}
        />
      ) : joinableSession ? (
        <div className="mt-2 shrink-0 space-y-2 rounded-lg border border-rf-rose/35 bg-rf-plum-ink/5 p-2.5">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-rf-rose" />
            <h3 className="text-xs font-semibold text-rf-plum-ink">
              Session Starting Soon
            </h3>
          </div>

          <JoinCountdown startTime={joinableSession.start} />

          <div className="flex flex-col gap-1.5">
            <Link
              href={`/sessions/${joinableSession.id}`}
              onClick={() => {
                releaseAllLocalMediaStreams();
                setDeviceTestOpen(false);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-rf-primary px-3 py-2 text-center text-xs font-semibold text-rf-on-primary transition-colors hover:bg-rf-primary-hover"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              Join Now
            </Link>

            <button
              type="button"
              onClick={() => setDeviceTestOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-rf-line/80 bg-rf-card px-3 py-2 text-xs font-semibold text-[#54657E] transition-colors hover:bg-rf-line-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose/35 dark:text-gray-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Test audio and video
            </button>

            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(
                  `${window.location.origin}/sessions/${joinableSession.id}`,
                );
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rf-line/80 bg-transparent px-3 py-1.5 text-xs font-medium text-rf-ink-soft transition-colors hover:bg-rf-line-soft"
            >
              Copy Meeting Link
            </button>
          </div>
        </div>
      ) : null}

      <SidebarUpdatesBox />

      <div className="min-h-0 flex-1" aria-hidden="true" />

      {!joinableSession || showUpNext ? (
        <div className="shrink-0 space-y-1.5 border-t border-rf-line-soft/80 pt-2">
          <button
            type="button"
            onClick={() => setDeviceTestOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-rf-line/80 bg-rf-card px-3 py-2 text-xs font-semibold text-[#54657E] transition-colors hover:bg-rf-line-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose/35 dark:text-gray-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Test audio and video
          </button>

          <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                void navigator.share({
                  title: "Refocus",
                  text: "Check out Refocus - Virtual coworking made easy!",
                  url: window.location.origin,
                });
              } else {
                void navigator.clipboard.writeText(window.location.origin);
              }
            }}
            className={utilityRowClass}
          >
            <span className="flex items-center gap-2 text-rf-ink-soft">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share Refocus
            </span>
          </button>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] text-red-600/75 transition-colors hover:bg-red-50/80 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose/35 dark:text-red-400/75 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign Out
          </button>
          </div>
        </div>
      ) : null}

      <DeviceTestModal
        open={deviceTestOpen}
        onClose={() => {
          releaseAllLocalMediaStreams();
          setDeviceTestOpen(false);
        }}
      />
        </div>
      </div>
    </aside>
  );
}
