"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

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
      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
        Session is live now!
      </p>
    );
  }

  return (
    <p className="text-xs text-emerald-800 dark:text-emerald-200">
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
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function CalendarRightSidebar({ sessionCount, onGoToday, joinableSession }: CalendarRightSidebarProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const user = session?.user as { name?: string; email?: string; image?: string } | undefined;
  
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <aside
      className={`shrink-0 flex flex-col h-full overflow-hidden transition-[width] duration-300 ease-in-out ${
        isCollapsed ? "w-14" : "w-56"
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
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Expand sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          <Avatar className="h-10 w-10">
            {user?.image ? (
              <AvatarImage src={user.image} alt={displayName} />
            ) : null}
            <AvatarFallback className="text-sm font-semibold bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1" />
          <Link
            href="/profile"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Profile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
          <button
            onClick={() => mounted && setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Toggle theme"
          >
            {mounted && theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 transition-colors"
            title="Sign out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Expanded content */}
        <div
          className={`absolute inset-0 flex flex-col gap-2 pb-2 overflow-hidden transition-opacity duration-300 ${
            !isCollapsed ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
      {/* Collapse button */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="self-end p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Collapse sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      {/* User Profile Card */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-11 w-11 mb-2">
            {user?.image ? (
              <AvatarImage src={user.image} alt={displayName} />
            ) : null}
            <AvatarFallback className="text-sm font-semibold bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {getGreeting()}, {firstName}!
          </h2>
          
          <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
            {formatDate()}
          </p>
          
          <Link
            href="/sessions"
            className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {sessionCount} session{sessionCount !== 1 ? "s" : ""}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
          <button
            onClick={onGoToday}
            className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Jump to Today
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          <Link
            href="/profile"
            className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Profile
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Link>

          <button
            onClick={() => mounted && setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-1.5">
              {mounted && theme === "dark" ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Light Mode
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Dark Mode
                </>
              )}
            </span>
            <div className={`w-7 h-3.5 rounded-full transition-colors ${mounted && theme === "dark" ? "bg-indigo-600" : "bg-gray-300"} relative`}>
              <div className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-transform ${mounted && theme === "dark" ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-h-0" />

      {/* Interchangeable Bottom Section */}
      {joinableSession ? (
        /* Joinable Session Section */
        <div className="shrink-0 rounded-lg border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
              Session Starting Soon
            </h3>
          </div>
          
          <JoinCountdown startTime={joinableSession.start} />
          
          <div className="flex flex-col gap-1.5">
            <Link
              href={`/sessions/${joinableSession.id}`}
              className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs text-center transition-colors flex items-center justify-center gap-1.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              Join Now
            </Link>
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/sessions/${joinableSession.id}`);
                // Could add a toast here
              }}
              className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 font-medium text-xs hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy Meeting Link
            </button>
          </div>
        </div>
      ) : (
        /* Default Bottom Section */
        <div className="shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1.5 space-y-0.5">
        <Link
          href="https://github.com/your-repo/refocus"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Star on GitHub
        </Link>
        
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: "Refocus",
                text: "Check out Refocus - Virtual coworking made easy!",
                url: window.location.origin,
              });
            } else {
              navigator.clipboard.writeText(window.location.origin);
              alert("Link copied to clipboard!");
            }
          }}
          className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share Refocus
        </button>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
        </div>
      )}
        </div>
      </div>
    </aside>
  );
}
