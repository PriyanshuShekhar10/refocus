"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SessionCountdownProps {
  startTime: string;
  sessionId: string;
}

export default function SessionCountdown({ startTime, sessionId: _sessionId }: SessionCountdownProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const start = new Date(startTime);
      const oneHourBefore = new Date(start.getTime() - 60 * 60 * 1000);
      const diff = oneHourBefore.getTime() - now.getTime();

      if (diff <= 0) {
        // Time to join! Refresh the page to show the video call
        router.refresh();
        return null;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      if (newTimeLeft) {
        setTimeLeft(newTimeLeft);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, router]);

  const formatTime = (value: number) => value.toString().padStart(2, "0");

  return (
    <div className="mt-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 text-amber-600 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Session Not Yet Available
      </h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        You can join this session 1 hour before it starts.
      </p>

      {timeLeft && (
        <div className="mt-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Join available in
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {formatTime(timeLeft.hours)}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                hours
              </span>
            </div>
            <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">:</span>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {formatTime(timeLeft.minutes)}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                mins
              </span>
            </div>
            <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">:</span>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {formatTime(timeLeft.seconds)}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                secs
              </span>
            </div>
          </div>
        </div>
      )}

      <p className="mt-5 text-xs text-gray-500 dark:text-gray-400">
        Session starts at{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {new Date(startTime).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            day: "numeric",
            month: "short",
          })}
        </span>{" "}
        IST
      </p>
    </div>
  );
}
