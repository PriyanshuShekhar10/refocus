"use client";

import Calendar from "./Calendar";
import { MobileCalendar } from "./Mobile";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";

export default function Dashboard() {
  const { isMobile } = useIsMobileShell();

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
