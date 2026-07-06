"use client";

import Calendar from "./Calendar";
import { MobileCalendar } from "./Mobile";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";

export default function Dashboard() {
  const { isMobile, mounted } = useIsMobileShell();

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="h-full min-h-0">
        <MobileCalendar />
      </div>
    );
  }

  return (
    <div className="h-full">
      <Calendar />
    </div>
  );
}
